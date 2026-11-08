import { Chess, Square, Move } from 'chess.js';
import { CandidateMoveInfo } from '../types/chess';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];

const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-30,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_TABLE_MID = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

/**
 * Evaluates a chess position in centipawns from White's perspective (+ = White advantage, - = Black advantage).
 */
export function evaluateBoardWhiteCp(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -100000 : 100000;
  }
  if (
    chess.isDraw() ||
    chess.isStalemate() ||
    chess.isThreefoldRepetition() ||
    chess.isInsufficientMaterial()
  ) {
    return 0;
  }

  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const squareIdx = r * 8 + c;
      const flippedIdx = (7 - r) * 8 + c;
      const pieceVal = PIECE_VALUES[piece.type] || 0;
      let positionalVal = 0;

      switch (piece.type) {
        case 'p':
          positionalVal = piece.color === 'w' ? PAWN_TABLE[squareIdx] : PAWN_TABLE[flippedIdx];
          break;
        case 'n':
          positionalVal = piece.color === 'w' ? KNIGHT_TABLE[squareIdx] : KNIGHT_TABLE[flippedIdx];
          break;
        case 'b':
          positionalVal = piece.color === 'w' ? BISHOP_TABLE[squareIdx] : BISHOP_TABLE[flippedIdx];
          break;
        case 'r':
          positionalVal = piece.color === 'w' ? ROOK_TABLE[squareIdx] : ROOK_TABLE[flippedIdx];
          break;
        case 'q':
          positionalVal = piece.color === 'w' ? QUEEN_TABLE[squareIdx] : QUEEN_TABLE[flippedIdx];
          break;
        case 'k':
          positionalVal =
            piece.color === 'w' ? KING_TABLE_MID[squareIdx] : KING_TABLE_MID[flippedIdx];
          break;
      }

      const total = pieceVal + positionalVal;
      if (piece.color === 'w') {
        score += total;
      } else {
        score -= total;
      }
    }
  }

  return score;
}

function moveToUci(m: Move): string {
  return `${m.from}${m.to}${m.promotion || ''}`;
}

function orderMoves(moves: Move[], ttBestUci?: string): Move[] {
  return moves.sort((a, b) => {
    const uciA = moveToUci(a);
    const uciB = moveToUci(b);
    if (ttBestUci) {
      if (uciA === ttBestUci) return -1;
      if (uciB === ttBestUci) return 1;
    }
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0);
    if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0);
    if (a.promotion) scoreA += 800;
    if (b.promotion) scoreB += 800;
    if (a.san.includes('+')) scoreA += 150;
    if (b.san.includes('+')) scoreB += 150;
    return scoreB - scoreA;
  });
}

export interface UciSearchOutput {
  bestMoveUci: string;
  ponderUci?: string;
  scoreCpWhite: number;
  mateIn?: number;
  depth: number;
  selDepth: number;
  nodes: number;
  nps: number;
  timeMs: number;
  pv: string[];
  candidates: CandidateMoveInfo[];
  threatUci?: string;
}

/**
 * Stateful UCI Engine Protocol implementation that runs inside our Web Worker
 * (and can also be tested directly in Node.js unit tests).
 */
export class UciEngineSession {
  private currentFen: string = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  private skillLevel: number = 20;
  private limitStrength: boolean = false;
  private uciElo: number = 1500;
  private stopRequested: boolean = false;
  private ttCache = new Map<string, { depth: number; score: number; bestUci: string }>();
  private onEmitLine: (line: string) => void;

  constructor(onEmitLine: (line: string) => void) {
    this.onEmitLine = onEmitLine;
  }

  public handleCommand(rawCmd: string): void {
    const cmd = rawCmd.trim();
    if (!cmd) return;

    if (cmd === 'uci') {
      this.onEmitLine('id name Stockfish-Academy-UCI 16.1');
      this.onEmitLine('id author AI Chess Academy Engine Team');
      this.onEmitLine('option name Skill Level type spin default 20 min 0 max 20');
      this.onEmitLine('option name UCI_LimitStrength type check default false');
      this.onEmitLine('option name UCI_Elo type spin default 1500 min 400 max 2800');
      this.onEmitLine('uciok');
      return;
    }

    if (cmd === 'isready') {
      this.onEmitLine('readyok');
      return;
    }

    if (cmd === 'ucinewgame') {
      this.ttCache.clear();
      this.currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      return;
    }

    if (cmd.startsWith('setoption')) {
      const skillMatch = cmd.match(/name Skill Level value (\d+)/i);
      if (skillMatch) {
        this.skillLevel = Math.max(0, Math.min(20, parseInt(skillMatch[1], 10)));
      }
      const limitMatch = cmd.match(/name UCI_LimitStrength value (true|false)/i);
      if (limitMatch) {
        this.limitStrength = limitMatch[1].toLowerCase() === 'true';
      }
      const eloMatch = cmd.match(/name UCI_Elo value (\d+)/i);
      if (eloMatch) {
        this.uciElo = Math.max(400, Math.min(2800, parseInt(eloMatch[1], 10)));
      }
      return;
    }

    if (cmd.startsWith('position')) {
      this.parsePositionCommand(cmd);
      return;
    }

    if (cmd.startsWith('go')) {
      this.stopRequested = false;
      this.parseGoCommand(cmd);
      return;
    }

    if (cmd === 'stop') {
      this.stopRequested = true;
      return;
    }

    if (cmd === 'quit') {
      this.stopRequested = true;
      this.ttCache.clear();
      return;
    }
  }

  public requestStop(): void {
    this.stopRequested = true;
  }

  private parsePositionCommand(cmd: string): void {
    const chess = new Chess();
    let movesPart = '';

    if (cmd.includes('startpos')) {
      chess.reset();
      const idx = cmd.indexOf('moves ');
      if (idx !== -1) movesPart = cmd.slice(idx + 6).trim();
    } else if (cmd.includes('fen ')) {
      const fenStart = cmd.indexOf('fen ') + 4;
      const movesIdx = cmd.indexOf(' moves ');
      const fenStr =
        movesIdx !== -1 ? cmd.slice(fenStart, movesIdx).trim() : cmd.slice(fenStart).trim();
      try {
        chess.load(fenStr);
      } catch {
        chess.reset();
      }
      if (movesIdx !== -1) {
        movesPart = cmd.slice(movesIdx + 7).trim();
      }
    }

    if (movesPart) {
      const tokens = movesPart.split(/\s+/);
      for (const tok of tokens) {
        if (!tok) continue;
        try {
          if (tok.length >= 4 && /^[a-h][1-8][a-h][1-8]/.test(tok)) {
            chess.move({
              from: tok.slice(0, 2) as Square,
              to: tok.slice(2, 4) as Square,
              promotion: tok.length > 4 ? tok.slice(4, 5) : undefined,
            });
          } else {
            chess.move(tok);
          }
        } catch {
          break;
        }
      }
    }

    this.currentFen = chess.fen();
  }

  private parseGoCommand(cmd: string): void {
    const depthMatch = cmd.match(/depth\s+(\d+)/i);
    const movetimeMatch = cmd.match(/movetime\s+(\d+)/i);

    const maxDepth = depthMatch ? Math.min(8, Math.max(1, parseInt(depthMatch[1], 10))) : 5;
    const moveTimeMs = movetimeMatch ? Math.max(20, parseInt(movetimeMatch[1], 10)) : 350;

    this.runIterativeSearch(this.currentFen, maxDepth, moveTimeMs);
  }

  public runIterativeSearch(
    fen: string,
    maxDepth: number,
    moveTimeMs: number
  ): UciSearchOutput {
    const startTime = performance.now();
    const deadline = startTime + moveTimeMs;
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch {
      chess.reset();
    }

    const rootMoves = orderMoves(chess.moves({ verbose: true }));
    if (rootMoves.length === 0) {
      this.onEmitLine('bestmove (none)');
      return {
        bestMoveUci: '(none)',
        scoreCpWhite: 0,
        depth: 0,
        selDepth: 0,
        nodes: 0,
        nps: 0,
        timeMs: 1,
        pv: [],
        candidates: [],
      };
    }

    let nodes = 0;
    let maxSelDepth = 1;
    const isWhiteTurn = chess.turn() === 'w';
    let bestMoveObj: Move = rootMoves[0];
    let bestScoreWhite = evaluateBoardWhiteCp(chess);
    let candidateScores = new Map<string, { move: Move; scoreWhite: number; pv: string[] }>();

    const checkDeadline = (): boolean => {
      if (this.stopRequested) return true;
      if ((nodes & 127) === 0 && performance.now() >= deadline) {
        return true;
      }
      return false;
    };

    const quiescence = (
      board: Chess,
      alpha: number,
      beta: number,
      maximizing: boolean,
      qDepth: number,
      ply: number
    ): number => {
      nodes++;
      if (ply > maxSelDepth) maxSelDepth = ply;
      const standPat = evaluateBoardWhiteCp(board);

      if (qDepth <= 0 || checkDeadline()) {
        return standPat;
      }

      if (maximizing) {
        if (standPat >= beta) return beta;
        if (alpha < standPat) alpha = standPat;
      } else {
        if (standPat <= alpha) return alpha;
        if (beta > standPat) beta = standPat;
      }

      const captures = board
        .moves({ verbose: true })
        .filter((m) => Boolean(m.captured || m.promotion));
      if (captures.length === 0) return standPat;

      orderMoves(captures);

      if (maximizing) {
        let best = standPat;
        for (const cap of captures) {
          board.move(cap);
          const score = quiescence(board, alpha, beta, false, qDepth - 1, ply + 1);
          board.undo();
          if (score > best) best = score;
          if (best > alpha) alpha = best;
          if (alpha >= beta || this.stopRequested) break;
        }
        return best;
      } else {
        let best = standPat;
        for (const cap of captures) {
          board.move(cap);
          const score = quiescence(board, alpha, beta, true, qDepth - 1, ply + 1);
          board.undo();
          if (score < best) best = score;
          if (best < beta) beta = best;
          if (alpha >= beta || this.stopRequested) break;
        }
        return best;
      }
    };

    const alphaBeta = (
      board: Chess,
      depth: number,
      alpha: number,
      beta: number,
      maximizing: boolean,
      ply: number
    ): { score: number; pv: string[] } => {
      nodes++;
      if (ply > maxSelDepth) maxSelDepth = ply;

      if (board.isGameOver()) {
        if (board.isCheckmate()) {
          // Prefer faster checkmates
          const mateScore = maximizing ? -100000 + ply * 100 : 100000 - ply * 100;
          return { score: mateScore, pv: [] };
        }
        return { score: 0, pv: [] };
      }

      if (depth <= 0) {
        return {
          score: quiescence(board, alpha, beta, maximizing, 2, ply),
          pv: [],
        };
      }

      const fenKey = board.fen();
      const ttEntry = this.ttCache.get(fenKey);
      const legal = orderMoves(board.moves({ verbose: true }), ttEntry?.bestUci);

      if (maximizing) {
        let maxEval = -Infinity;
        let bestPv: string[] = [];
        let bestUci = moveToUci(legal[0]);

        for (const m of legal) {
          board.move(m);
          const child = alphaBeta(board, depth - 1, alpha, beta, false, ply + 1);
          board.undo();

          if (child.score > maxEval) {
            maxEval = child.score;
            bestUci = moveToUci(m);
            bestPv = [bestUci, ...child.pv];
          }
          if (maxEval > alpha) alpha = maxEval;
          if (beta <= alpha || checkDeadline()) break;
        }

        if (!checkDeadline()) {
          this.ttCache.set(fenKey, { depth, score: maxEval, bestUci });
        }
        return { score: maxEval, pv: bestPv };
      } else {
        let minEval = Infinity;
        let bestPv: string[] = [];
        let bestUci = moveToUci(legal[0]);

        for (const m of legal) {
          board.move(m);
          const child = alphaBeta(board, depth - 1, alpha, beta, true, ply + 1);
          board.undo();

          if (child.score < minEval) {
            minEval = child.score;
            bestUci = moveToUci(m);
            bestPv = [bestUci, ...child.pv];
          }
          if (minEval < beta) beta = minEval;
          if (beta <= alpha || checkDeadline()) break;
        }

        if (!checkDeadline()) {
          this.ttCache.set(fenKey, { depth, score: minEval, bestUci });
        }
        return { score: minEval, pv: bestPv };
      }
    };

    let completedDepth = 1;
    let bestPvLine: string[] = [moveToUci(bestMoveObj)];

    // Iterative Deepening Loop (1 .. maxDepth)
    for (let currentDepth = 1; currentDepth <= maxDepth; currentDepth++) {
      if (currentDepth > 1 && checkDeadline()) break;

      const orderedRoot = orderMoves([...rootMoves], moveToUci(bestMoveObj));
      let iterationBestMove = orderedRoot[0];
      let iterationBestScore = isWhiteTurn ? -Infinity : Infinity;
      let iterationBestPv: string[] = [moveToUci(iterationBestMove)];
      const currentCandidates = new Map<
        string,
        { move: Move; scoreWhite: number; pv: string[] }
      >();

      let alpha = -Infinity;
      let beta = Infinity;

      for (const m of orderedRoot) {
        if (currentDepth > 1 && checkDeadline()) break;
        chess.move(m);
        const child = alphaBeta(
          chess,
          currentDepth - 1,
          alpha,
          beta,
          !isWhiteTurn,
          1
        );
        chess.undo();

        const uci = moveToUci(m);
        const pv = [uci, ...child.pv];
        currentCandidates.set(uci, { move: m, scoreWhite: child.score, pv });

        if (isWhiteTurn) {
          if (child.score > iterationBestScore) {
            iterationBestScore = child.score;
            iterationBestMove = m;
            iterationBestPv = pv;
          }
          if (iterationBestScore > alpha) alpha = iterationBestScore;
        } else {
          if (child.score < iterationBestScore) {
            iterationBestScore = child.score;
            iterationBestMove = m;
            iterationBestPv = pv;
          }
          if (iterationBestScore < beta) beta = iterationBestScore;
        }
      }

      if (!this.stopRequested) {
        bestMoveObj = iterationBestMove;
        bestScoreWhite = iterationBestScore;
        bestPvLine = iterationBestPv;
        completedDepth = currentDepth;
        candidateScores = currentCandidates;

        const elapsedMs = Math.max(1, Math.round(performance.now() - startTime));
        const nps = Math.round((nodes * 1000) / elapsedMs);
        const sideToMoveCp = isWhiteTurn ? bestScoreWhite : -bestScoreWhite;
        const isMateScore = Math.abs(sideToMoveCp) >= 90000;
        const matePlies = isMateScore
          ? Math.max(1, Math.round((100000 - Math.abs(sideToMoveCp)) / 100))
          : 0;
        const mateMoves = Math.ceil(matePlies / 2) * (sideToMoveCp > 0 ? 1 : -1);

        const scoreToken = isMateScore
          ? `mate ${mateMoves}`
          : `cp ${Math.round(sideToMoveCp)}`;

        this.onEmitLine(
          `info depth ${completedDepth} seldepth ${maxSelDepth} score ${scoreToken} nodes ${nodes} nps ${nps} time ${elapsedMs} pv ${bestPvLine.join(' ')}`
        );
      }
    }

    // Apply realistic skill-level / Elo imperfection for Beginner / Easy / Intermediate when configured
    const sortedCandidates = Array.from(candidateScores.values()).sort((a, b) =>
      isWhiteTurn ? b.scoreWhite - a.scoreWhite : a.scoreWhite - b.scoreWhite
    );

    if (this.skillLevel < 15 && sortedCandidates.length > 1) {
      // Never miss a forced mate in 1 when skillLevel >= 5
      const topScoreSide = isWhiteTurn
        ? sortedCandidates[0].scoreWhite
        : -sortedCandidates[0].scoreWhite;
      const isForcedMate1 = topScoreSide >= 98000;

      if (!isForcedMate1 || this.skillLevel <= 2) {
        // Controlled temperature selection among top candidate moves based on Skill Level (0..20)
        const noiseRangeCp = (20 - this.skillLevel) * 18;
        if (this.skillLevel <= 6 && noiseRangeCp > 0) {
          const closeCandidates = sortedCandidates.slice(
            0,
            Math.min(4, sortedCandidates.length)
          );
          let bestNoisy = closeCandidates[0];
          let bestNoisyScore = -Infinity;
          for (const cand of closeCandidates) {
            const sideCp = isWhiteTurn ? cand.scoreWhite : -cand.scoreWhite;
            const noisy = sideCp + (Math.random() - 0.5) * noiseRangeCp * 2;
            if (noisy > bestNoisyScore) {
              bestNoisyScore = noisy;
              bestNoisy = cand;
            }
          }
          bestMoveObj = bestNoisy.move;
          bestScoreWhite = bestNoisy.scoreWhite;
          bestPvLine = bestNoisy.pv;
        }
      }
    }

    const bestUci = moveToUci(bestMoveObj);
    const ponderUci = bestPvLine.length > 1 ? bestPvLine[1] : undefined;
    const elapsedMs = Math.max(1, Math.round(performance.now() - startTime));
    const nps = Math.round((nodes * 1000) / elapsedMs);

    const candidatesList: CandidateMoveInfo[] = sortedCandidates
      .slice(0, 3)
      .map((c) => ({
        uci: moveToUci(c.move),
        san: c.move.san,
        from: c.move.from as Square,
        to: c.move.to as Square,
        scoreCp: c.scoreWhite,
        mateIn:
          Math.abs(c.scoreWhite) >= 90000
            ? Math.ceil(Math.max(1, (100000 - Math.abs(c.scoreWhite)) / 100) / 2) *
              (c.scoreWhite > 0 ? 1 : -1)
            : undefined,
        pv: c.pv,
      }));

    if (ponderUci) {
      this.onEmitLine(`bestmove ${bestUci} ponder ${ponderUci}`);
    } else {
      this.onEmitLine(`bestmove ${bestUci}`);
    }

    return {
      bestMoveUci: bestUci,
      ponderUci,
      scoreCpWhite: bestScoreWhite,
      depth: completedDepth,
      selDepth: maxSelDepth,
      nodes,
      nps,
      timeMs: elapsedMs,
      pv: bestPvLine,
      candidates: candidatesList,
      threatUci: ponderUci,
    };
  }
}
