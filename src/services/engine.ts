import { Chess, Square } from 'chess.js';
import {
  CandidateMoveInfo,
  DifficultyConfig,
  EngineDifficulty,
  EngineSpeedMode,
  EngineTelemetry,
} from '../types/chess';
import { evaluateBoardWhiteCp, UciEngineSession } from './uciCore';

export const DIFFICULTY_LEVELS: Record<EngineDifficulty, DifficultyConfig> = {
  beginner: {
    id: 'beginner',
    name: 'Beginner (Sparrow)',
    elo: 400,
    depth: 2,
    skillLevel: 0,
    targetMoveTimeMs: { min: 100, max: 250, defaultMs: 140 },
    errorProbability: 0.3,
    description: 'Casual beginner (~400 Elo approx). Plays quickly and makes basic tactical errors.',
    avatar: '🐥',
  },
  easy: {
    id: 'easy',
    name: 'Easy (Cadet)',
    elo: 600,
    depth: 2,
    skillLevel: 3,
    targetMoveTimeMs: { min: 150, max: 350, defaultMs: 200 },
    errorProbability: 0.16,
    description: 'Developing player (~600 Elo approx). Knows opening basics but misses deeper tactics.',
    avatar: '🛡️',
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate (Knight)',
    elo: 1000,
    depth: 3,
    skillLevel: 7,
    targetMoveTimeMs: { min: 250, max: 500, defaultMs: 300 },
    errorProbability: 0.06,
    description: 'Club tactical player (~1000 Elo approx). Punishes hanging pieces and develops logically.',
    avatar: '♞',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced (Bishop)',
    elo: 1400,
    depth: 4,
    skillLevel: 12,
    targetMoveTimeMs: { min: 400, max: 800, defaultMs: 460 },
    errorProbability: 0.02,
    description: 'Tournament player (~1400 Elo approx). Calculates multi-move combinations and defends well.',
    avatar: '♝',
  },
  expert: {
    id: 'expert',
    name: 'Expert (Rook)',
    elo: 1800,
    depth: 5,
    skillLevel: 16,
    targetMoveTimeMs: { min: 600, max: 1200, defaultMs: 680 },
    errorProbability: 0.0,
    description: 'Candidate Master (~1800 Elo approx). Strong positional awareness and sharp calculation.',
    avatar: '♜',
  },
  master: {
    id: 'master',
    name: 'Master (Queen)',
    elo: 2200,
    depth: 6,
    skillLevel: 20,
    targetMoveTimeMs: { min: 800, max: 1500, defaultMs: 880 },
    errorProbability: 0.0,
    description: 'Grandmaster level (~2200+ Elo approx). Maximum engine precision and deep calculation.',
    avatar: '♛',
  },
};

export interface BestMoveResult {
  from: Square;
  to: Square;
  promotion?: string;
  san?: string;
  ponder?: { from: Square; to: Square; san?: string };
  telemetry?: EngineTelemetry;
  searchId?: number;
  fenSearched?: string;
}

interface PendingSearch {
  searchId: number;
  fen: string;
  isWhiteTurn: boolean;
  startTime: number;
  telemetry: EngineTelemetry;
  resolve: (res: BestMoveResult | null) => void;
}

type TelemetryListener = (telemetry: EngineTelemetry) => void;

export class ChessEngine {
  private worker: Worker | null = null;
  private fallbackSession: UciEngineSession | null = null;
  private isInitialized: boolean = false;
  private isUciReady: boolean = false;
  private initCount: number = 0;
  private searchCounter: number = 0;
  private activeSearch: PendingSearch | null = null;
  private readyResolvers: Array<() => void> = [];
  private speedMode: EngineSpeedMode = 'balanced';
  private telemetryListeners = new Set<TelemetryListener>();
  private lastTelemetry: EngineTelemetry = {
    depth: 0,
    selDepth: 0,
    scoreCp: 0,
    nodes: 0,
    nps: 0,
    timeMs: 0,
    pv: [],
    candidates: [],
    engineBackend: 'uci-worker',
  };

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Initializes the Worker once and reuses it across all moves and games.
   */
  public ensureInitialized(): void {
    if (this.isInitialized && (this.worker || this.fallbackSession)) {
      return;
    }

    this.initCount++;
    this.isInitialized = true;
    this.isUciReady = false;

    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('../workers/stockfishWorker.ts', import.meta.url),
          { type: 'module' }
        );
        this.worker.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data : '';
          this.handleUciOutputLine(line);
        };
        this.worker.onerror = () => {
          // Graceful crash recovery
          this.recoverFromWorkerError();
        };
        this.postUciCommand('uci');
        this.postUciCommand('isready');
        return;
      } catch {
        // Fall through to async session port
      }
    }

    this.initAsyncSessionFallback();
  }

  private initAsyncSessionFallback(): void {
    this.worker = null;
    this.fallbackSession = new UciEngineSession((line: string) => {
      this.handleUciOutputLine(line);
    });
    this.postUciCommand('uci');
    this.postUciCommand('isready');
  }

  /**
   * Recovers cleanly if the Worker crashes or throws an error.
   */
  public recoverFromWorkerError(): void {
    if (this.activeSearch) {
      const pending = this.activeSearch;
      this.activeSearch = null;
      pending.resolve(null);
    }
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
    }
    this.isInitialized = false;
    this.isUciReady = false;
    this.initAsyncSessionFallback();
    this.isInitialized = true;
  }

  public getInitCount(): number {
    return this.initCount;
  }

  public isReady(): boolean {
    return this.isUciReady;
  }

  public setSpeedMode(mode: EngineSpeedMode): void {
    this.speedMode = mode;
  }

  public getSpeedMode(): EngineSpeedMode {
    return this.speedMode;
  }

  public getLastTelemetry(): EngineTelemetry {
    return this.lastTelemetry;
  }

  public onTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  private emitTelemetry(t: EngineTelemetry): void {
    this.lastTelemetry = t;
    for (const listener of this.telemetryListeners) {
      try {
        listener(t);
      } catch {
        // Ignore listener errors
      }
    }
  }

  public postUciCommand(cmd: string): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
    } else if (this.fallbackSession) {
      // Execute asynchronously via microtask/timeout so caller is never blocked synchronously
      if (cmd.startsWith('go ')) {
        setTimeout(() => {
          this.fallbackSession?.handleCommand(cmd);
        }, 0);
      } else {
        this.fallbackSession.handleCommand(cmd);
      }
    }
  }

  public async waitReady(): Promise<void> {
    this.ensureInitialized();
    if (this.isUciReady) return;
    return new Promise<void>((resolve) => {
      this.readyResolvers.push(resolve);
      this.postUciCommand('isready');
    });
  }

  private handleUciOutputLine(line: string): void {
    if (!line) return;

    if (line === 'uciok' || line === 'readyok') {
      this.isUciReady = true;
      if (this.readyResolvers.length > 0) {
        const resolvers = [...this.readyResolvers];
        this.readyResolvers = [];
        resolvers.forEach((r) => r());
      }
      return;
    }

    if (line.startsWith('info ') && this.activeSearch) {
      this.parseUciInfoLine(line, this.activeSearch);
      return;
    }

    if (line.startsWith('bestmove')) {
      this.parseUciBestMoveLine(line);
    }
  }

  private parseUciInfoLine(line: string, search: PendingSearch): void {
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const selDepthMatch = line.match(/\bseldepth\s+(\d+)/);
    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    const nodesMatch = line.match(/\bnodes\s+(\d+)/);
    const npsMatch = line.match(/\bnps\s+(\d+)/);
    const timeMatch = line.match(/\btime\s+(\d+)/);
    const pvMatch = line.match(/\bpv\s+(.+)$/);

    const t = { ...search.telemetry };
    if (depthMatch) t.depth = parseInt(depthMatch[1], 10);
    if (selDepthMatch) t.selDepth = parseInt(selDepthMatch[1], 10);
    if (nodesMatch) t.nodes = parseInt(nodesMatch[1], 10);
    if (npsMatch) t.nps = parseInt(npsMatch[1], 10);
    if (timeMatch) t.timeMs = parseInt(timeMatch[1], 10);

    if (cpMatch) {
      const sideCp = parseInt(cpMatch[1], 10);
      t.scoreCp = search.isWhiteTurn ? sideCp : -sideCp;
      t.mateIn = undefined;
    } else if (mateMatch) {
      const sideMate = parseInt(mateMatch[1], 10);
      const whiteMate = search.isWhiteTurn ? sideMate : -sideMate;
      t.mateIn = whiteMate;
      t.scoreCp = whiteMate > 0 ? 100000 - whiteMate * 100 : -100000 - whiteMate * 100;
    }

    if (pvMatch) {
      t.pv = pvMatch[1].trim().split(/\s+/);
      if (t.pv.length > 0 && t.pv[0].length >= 4) {
        const firstUci = t.pv[0];
        t.bestMove = {
          from: firstUci.slice(0, 2) as Square,
          to: firstUci.slice(2, 4) as Square,
          promotion: firstUci.length > 4 ? firstUci.slice(4, 5) : undefined,
        };
      }
      if (t.pv.length > 1 && t.pv[1].length >= 4) {
        const secondUci = t.pv[1];
        t.threatMove = {
          from: secondUci.slice(0, 2) as Square,
          to: secondUci.slice(2, 4) as Square,
        };
      }
    }

    search.telemetry = t;
    this.emitTelemetry(t);
  }

  private parseUciBestMoveLine(line: string): void {
    const active = this.activeSearch;
    if (!active) return;
    this.activeSearch = null;

    const parts = line.trim().split(/\s+/);
    const moveUci = parts[1];
    const ponderIdx = parts.indexOf('ponder');
    const ponderUci = ponderIdx !== -1 ? parts[ponderIdx + 1] : undefined;

    if (!moveUci || moveUci === '(none)' || moveUci.length < 4) {
      active.resolve(null);
      return;
    }

    const from = moveUci.slice(0, 2) as Square;
    const to = moveUci.slice(2, 4) as Square;
    const promotion = moveUci.length > 4 ? moveUci.slice(4, 5) : undefined;

    let san: string | undefined;
    let ponderMove: { from: Square; to: Square; san?: string } | undefined;

    try {
      const sim = new Chess(active.fen);
      const m = sim.move({ from, to, promotion: promotion || 'q' });
      if (m) {
        san = m.san;
        if (ponderUci && ponderUci.length >= 4) {
          const pFrom = ponderUci.slice(0, 2) as Square;
          const pTo = ponderUci.slice(2, 4) as Square;
          const pProm = ponderUci.length > 4 ? ponderUci.slice(4, 5) : undefined;
          const pm = sim.move({ from: pFrom, to: pTo, promotion: pProm || 'q' });
          ponderMove = { from: pFrom, to: pTo, san: pm?.san };
        }
      }
    } catch {
      // Ignore SAN conversion error
    }

    // Build top candidate moves for engine visualization
    const candidates = this.computeQuickCandidates(active.fen, 3);
    const finalTelemetry: EngineTelemetry = {
      ...active.telemetry,
      timeMs: Math.max(1, Math.round(performance.now() - active.startTime)),
      bestMove: { from, to, promotion, san },
      threatMove: ponderMove || active.telemetry.threatMove,
      candidates,
    };

    this.emitTelemetry(finalTelemetry);

    active.resolve({
      from,
      to,
      promotion,
      san,
      ponder: ponderMove,
      telemetry: finalTelemetry,
      searchId: active.searchId,
      fenSearched: active.fen,
    });
  }

  /**
   * Cancels any currently running engine search immediately via UCI `stop`.
   */
  public stop(): void {
    if (this.activeSearch) {
      const stale = this.activeSearch;
      this.activeSearch = null;
      this.postUciCommand('stop');
      stale.resolve(null);
    } else {
      this.postUciCommand('stop');
    }
  }

  /**
   * Signals a new game to the engine, clearing transposition tables and cancelling any active search.
   */
  public startNewGame(): void {
    this.stop();
    this.postUciCommand('ucinewgame');
  }

  /**
   * Terminates the engine cleanly when no longer needed.
   */
  public quit(): void {
    this.stop();
    this.postUciCommand('quit');
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore
      }
      this.worker = null;
    }
    this.isInitialized = false;
    this.isUciReady = false;
  }

  /**
   * Computes scaled move time target based on difficulty and user's selected speed mode.
   */
  public getTargetMoveTimeMs(
    difficulty: EngineDifficulty,
    speedMode: EngineSpeedMode = this.speedMode
  ): number {
    const config = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.intermediate;
    const multiplier =
      speedMode === 'fast' ? 0.55 : speedMode === 'deep' ? 1.35 : 1.0;
    const raw = Math.round(config.targetMoveTimeMs.defaultMs * multiplier);
    return Math.max(
      50,
      Math.min(config.targetMoveTimeMs.max, raw)
    );
  }

  /**
   * Fast static evaluation of a position from White's perspective (+ = White advantage, - = Black advantage).
   */
  public evaluatePosition(chess: Chess): number {
    return evaluateBoardWhiteCp(chess);
  }

  /**
   * Computes top N candidate moves and opponent's primary threat for engine visualization.
   */
  public computeQuickCandidates(fen: string, topN: number = 3): CandidateMoveInfo[] {
    try {
      const board = new Chess(fen);
      const isWhite = board.turn() === 'w';
      const legal = board.moves({ verbose: true });
      const scored: CandidateMoveInfo[] = [];

      for (const m of legal) {
        board.move(m);
        const cpWhite = evaluateBoardWhiteCp(board);
        board.undo();
        scored.push({
          uci: `${m.from}${m.to}${m.promotion || ''}`,
          san: m.san,
          from: m.from as Square,
          to: m.to as Square,
          scoreCp: cpWhite,
          pv: [m.san],
        });
      }

      scored.sort((a, b) => (isWhite ? b.scoreCp - a.scoreCp : a.scoreCp - b.scoreCp));
      return scored.slice(0, topN);
    } catch {
      return [];
    }
  }

  /**
   * Detects the opponent's primary tactical threat in the current position by simulating a null-move / opponent turn.
   */
  public detectOpponentThreat(fen: string): { from: Square; to: Square; san: string } | null {
    try {
      const parts = fen.split(' ');
      if (parts.length < 4) return null;
      // Flip turn in FEN to see what the opponent threatens if given a free move
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      parts[3] = '-'; // clear ep square to keep FEN valid
      const oppChess = new Chess(parts.join(' '));
      const candidates = this.computeQuickCandidates(oppChess.fen(), 1);
      if (candidates.length > 0) {
        return {
          from: candidates[0].from,
          to: candidates[0].to,
          san: candidates[0].san,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Requests the best move from the Web Worker UCI engine.
   * Automatically cancels any outdated in-flight search so duplicate searches never conflict.
   */
  public async getBestMove(
    chess: Chess,
    difficulty: EngineDifficulty = 'intermediate',
    options?: {
      movetimeMs?: number;
      depthOverride?: number;
      speedMode?: EngineSpeedMode;
    }
  ): Promise<BestMoveResult | null> {
    this.ensureInitialized();
    const fen = chess.fen();
    const legalMoves = chess.moves({ verbose: true });
    if (legalMoves.length === 0) return null;

    // Cancel any previous search before starting the new one
    if (this.activeSearch) {
      this.stop();
    }

    const config = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.intermediate;
    const moveTimeMs =
      options?.movetimeMs ??
      this.getTargetMoveTimeMs(difficulty, options?.speedMode ?? this.speedMode);
    const searchDepth = options?.depthOverride ?? config.depth;

    const searchId = ++this.searchCounter;
    const isWhiteTurn = chess.turn() === 'w';

    return new Promise<BestMoveResult | null>((resolve) => {
      this.activeSearch = {
        searchId,
        fen,
        isWhiteTurn,
        startTime: performance.now(),
        telemetry: {
          depth: 1,
          selDepth: 1,
          scoreCp: evaluateBoardWhiteCp(chess),
          nodes: 0,
          nps: 0,
          timeMs: 0,
          pv: [],
          candidates: [],
          engineBackend: this.worker ? 'stockfish-wasm' : 'uci-worker',
        },
        resolve,
      };

      // Configure UCI strength & position
      this.postUciCommand(`setoption name Skill Level value ${config.skillLevel}`);
      this.postUciCommand(
        `setoption name UCI_LimitStrength value ${config.elo < 2200 ? 'true' : 'false'}`
      );
      this.postUciCommand(`setoption name UCI_Elo value ${config.elo}`);
      this.postUciCommand(`position fen ${fen}`);
      this.postUciCommand(`go movetime ${moveTimeMs} depth ${searchDepth}`);
    });
  }

  /**
   * Formats centipawns to human-readable evaluation string (+1.2, -0.5, +M2).
   */
  public formatScore(centipawns: number): string {
    if (Math.abs(centipawns) >= 90000) {
      const matePlies = Math.max(1, Math.round((100000 - Math.abs(centipawns)) / 100));
      const mateMoves = Math.ceil(matePlies / 2);
      return centipawns > 0 ? `+M${mateMoves}` : `-M${mateMoves}`;
    }
    const pawns = (centipawns / 100).toFixed(1);
    return centipawns > 0 ? `+${pawns}` : `${pawns}`;
  }
}

export const chessEngine = new ChessEngine();
