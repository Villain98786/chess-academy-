import { Square, PieceSymbol, Color } from 'chess.js';

export type BoardTheme = 'emerald' | 'wood' | 'midnight' | 'cyber';
export type PieceTheme = 'classic' | 'modern';

export type EngineDifficulty = 'beginner' | 'easy' | 'intermediate' | 'advanced' | 'expert' | 'master';

export type EngineSpeedMode = 'fast' | 'balanced' | 'deep';

export interface DifficultyConfig {
  id: EngineDifficulty;
  name: string;
  elo: number;
  depth: number;
  skillLevel: number;
  targetMoveTimeMs: { min: number; max: number; defaultMs: number };
  errorProbability: number;
  description: string;
  avatar: string;
}

export interface TimeControlConfig {
  id: string;
  label: string;
  category: 'none' | 'bullet' | 'blitz' | 'rapid' | 'custom';
  minutes: number;
  incrementSeconds: number;
}

export interface AssistanceSettings {
  hintsEnabled: boolean;
  bestMoveArrow: boolean;
  threatArrows: boolean;
  evalBar: boolean;
  moveFeedback: boolean;
  thinkingIndicator: boolean;
  engineAnalysisPanel: boolean;
  takebacksAllowed: boolean;
}

export interface CandidateMoveInfo {
  uci: string;
  san: string;
  from: Square;
  to: Square;
  scoreCp: number;
  mateIn?: number;
  pv: string[];
}

export interface EngineTelemetry {
  depth: number;
  selDepth: number;
  scoreCp: number;
  mateIn?: number;
  nodes: number;
  nps: number;
  timeMs: number;
  pv: string[];
  bestMove?: { from: Square; to: Square; promotion?: string; san?: string };
  threatMove?: { from: Square; to: Square; san?: string };
  candidates: CandidateMoveInfo[];
  engineBackend: 'stockfish-wasm' | 'uci-worker';
}

export type TurnState = 'your_turn' | 'computer_thinking' | 'computer_moving' | 'game_over';

export type MoveClassificationType =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export type CoachState =
  | 'THINKING'
  | 'TEACHING'
  | 'PRAISING'
  | 'WARNING'
  | 'EXPLAINING'
  | 'HINTING'
  | 'CELEBRATING'
  | 'ENCOURAGING';

export type CoachAvatarReaction =
  | 'idle'
  | 'thinking'
  | 'happy'
  | 'warning'
  | 'explaining'
  | 'celebrating';

export type CoachHintLevel = 1 | 2 | 3;

export interface VoiceCoachingSettings {
  enabled: boolean;
  muted: boolean;
  rate: number; // 0.85 to 1.3
}

export interface CoachExplanation {
  id: string;
  state: CoachState;
  reaction: CoachAvatarReaction;
  headline: string;
  speechBubble: string;
  detailedExplanation: string;
  tacticalMotif?: string;
  conceptTag?: string;
  recommendedLessonId?: string;
  recommendedCourseId?: CourseLevelId;
  moveSan?: string;
  classification?: MoveClassificationType;
  evalDeltaPawns?: number;
  bestAlternativeSan?: string;
  bestAlternativeUci?: { from: Square; to: Square };
  threatSquare?: Square;
  threatMoveSan?: string;
  hintLevel?: CoachHintLevel;
  fen: string;
  moveCount: number;
  shouldSpeak: boolean;
}

export interface GameMove {
  from: Square;
  to: Square;
  san: string;
  piece: PieceSymbol;
  color: Color;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  fen: string;
  evalScore?: number; // centipawns or large for mate
  classification?: MoveClassificationType;
  bestAlternativeSan?: string;
  bestAlternativeUci?: { from: Square; to: Square };
  pv?: string[];
  isCriticalMoment?: boolean;
}

export interface GameRecord {
  id: string;
  date: string;
  playerColor: Color;
  opponent: string;
  opponentElo: number;
  result: 'win' | 'loss' | 'draw';
  reason: string;
  moves: GameMove[];
  userAccuracy?: number;
  opponentAccuracy?: number;
  initialTimeMinutes?: number;
  incrementSeconds?: number;
  openingName?: string;
  openingEco?: string;
  pgn?: string;
}

export type CourseLevelId = 'beginner' | 'intermediate' | 'advanced' | 'master';

export interface ChessLesson {
  id: string;
  courseId: CourseLevelId;
  title: string;
  description: string;
  conceptKey?: string;
  initialFen: string;
  playerColor: Color;
  instruction: string;
  demoMoves?: string[];
  task: {
    instruction: string;
    expectedMoves: string[];
    solutionExplanation: string;
  };
}

export interface ChessCourse {
  id: CourseLevelId;
  levelNumber: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  icon: string;
  levelElo: string;
  lessons: ChessLesson[];
}

export type PuzzleCategory =
  | 'mate1'
  | 'mate2'
  | 'mate3'
  | 'mate4'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered'
  | 'double_attack'
  | 'defensive'
  | 'daily';

export type PuzzleDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';

export interface ChessPuzzle {
  id: string;
  category: PuzzleCategory;
  title: string;
  theme: string;
  difficulty: PuzzleDifficulty;
  rating: number;
  fen: string;
  playerColor: Color;
  /** Number of user moves required to complete the puzzle (1 for Mate in 1, 2 for Mate in 2, 3 for Mate in 3, 4 for Mate in 4, etc.) */
  requiredMovesCount: number;
  /** Forced mate depth if this is a checkmate puzzle (1, 2, 3, 4), or undefined for material/defensive tactical puzzles */
  mateDepth?: number;
  /** Complete interleaved sequence of SAN moves: [userMove1, oppReply1, userMove2, oppReply2, ...] */
  solutionMoves: string[];
  /** Explanations keyed by odd ply index (1, 3, 5...) explaining why the opponent played that defensive response */
  opponentExplanations?: Record<number, string>;
  /** Optional custom explanations keyed by SAN for common wrong moves */
  wrongMoveExplanations?: Record<string, string>;
  hint: string;
  explanation: string;
}

export interface ChessOpening {
  id: string;
  name: string;
  eco: string;
  moves: string[];
  fen: string;
  description: string;
  keyIdeas: string[];
  whiteWinRate: number;
  blackWinRate: number;
  drawRate: number;
  trapsAndTricks: string;
}

export interface EloHistoryPoint {
  label: string;
  rapid: number;
  puzzle: number;
  estimated: number;
}

export interface UserStats {
  estimatedElo: number;
  rapidElo: number;
  blitzElo: number;
  puzzleElo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  puzzlesSolved: number;
  puzzlesAttempted: number;
  lessonsCompleted: string[];
  dailyStreak: number;
  lastActiveDate: string;
  practiceTimeMinutes: number;
  recentGames: GameRecord[];
  eloHistory?: EloHistoryPoint[];
}

export interface AppSettings {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  soundEnabled: boolean;
  soundVolume: number;
  showLegalMoves: boolean;
  showCoordinates: boolean;
  autoQueen: boolean;
  showEvalBar: boolean;
  engineDepth: number;
}
