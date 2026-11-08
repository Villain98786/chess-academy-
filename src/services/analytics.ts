import { Chess, Square } from 'chess.js';
import { GameMove } from '../types/chess';
import { CHESS_OPENINGS } from '../data/openings';

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win';

export interface ClassificationThresholds {
  /** Minimum mover evaluation gain (cp) or finding the only winning/saving move to qualify as 'great' */
  greatGainCp: number;
  /** Maximum centipawn loss from optimal to still count as 'best' when matching engine top choice */
  bestMaxLossCp: number;
  /** Maximum centipawn loss for 'excellent' */
  excellentMaxLossCp: number;
  /** Maximum centipawn loss for 'good' */
  goodMaxLossCp: number;
  /** Maximum centipawn loss for 'inaccuracy' */
  inaccuracyMaxLossCp: number;
  /** Maximum centipawn loss for 'mistake' (losses beyond this are 'blunder') */
  mistakeMaxLossCp: number;
  /** Advantage threshold (cp) where dropping to near-equality counts as a 'missed_win' */
  missedWinPrevAdvantageCp: number;
}

export const CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  greatGainCp: 90,
  bestMaxLossCp: 10,
  excellentMaxLossCp: 25,
  goodMaxLossCp: 50,
  inaccuracyMaxLossCp: 100,
  mistakeMaxLossCp: 220,
  missedWinPrevAdvantageCp: 260,
};

export interface InstantMoveFeedback {
  classification: MoveClassification;
  label: string;
  colorClass: string;
  badgeText: string;
  evalDeltaPawns: number;
  headline: string;
  tacticalNote: string;
  bestMoveSan?: string;
  bestMoveUci?: { from: Square; to: Square };
}

/**
 * Classifies a chess move based on centipawn evaluation before and after the move
 * strictly from the perspective of the player who made the move, taking into account
 * position context, forced/only moves, sacrifices, and checkmate threats.
 */
export function classifyMove(
  prevEvalWhiteCp: number,
  newEvalWhiteCp: number,
  moverColor: 'w' | 'b',
  isEngineBestMove: boolean,
  isCheckmate: boolean,
  wasSacrifice: boolean = false,
  thresholds: ClassificationThresholds = CLASSIFICATION_THRESHOLDS
): MoveClassification {
  if (isCheckmate) {
    return 'brilliant';
  }

  // Always normalize evaluation to the mover's perspective (+ is good for mover, - is bad for mover)
  const prevMoverCp = moverColor === 'w' ? prevEvalWhiteCp : -prevEvalWhiteCp;
  const newMoverCp = moverColor === 'w' ? newEvalWhiteCp : -newEvalWhiteCp;
  const moverDelta = newMoverCp - prevMoverCp;

  // Forced mate found by the mover
  if (newMoverCp >= 90000 && prevMoverCp < 90000) {
    return wasSacrifice ? 'brilliant' : 'great';
  }

  // Brilliant: sacrifice that maintains or improves a strong evaluation as engine best move
  if (wasSacrifice && moverDelta >= -20 && isEngineBestMove && newMoverCp >= -50) {
    return 'brilliant';
  }

  // Great move: turns an equal/difficult position into a clear advantage or finds a critical tactical jump
  if (isEngineBestMove && moverDelta >= thresholds.greatGainCp && newMoverCp >= 80) {
    return 'great';
  }

  // Best move: matches engine's top continuation without losing evaluation
  if (isEngineBestMove && moverDelta >= -thresholds.bestMaxLossCp) {
    return 'best';
  }

  if (moverDelta >= 30) {
    return isEngineBestMove ? 'great' : 'best';
  }

  if (moverDelta >= -thresholds.excellentMaxLossCp) {
    return isEngineBestMove ? 'best' : 'excellent';
  }

  if (moverDelta >= -thresholds.goodMaxLossCp) {
    return 'good';
  }

  // Position context: If player is still overwhelmingly winning (> +550cp) and drops 120cp, it's an inaccuracy rather than a blunder
  if (prevMoverCp >= 600 && newMoverCp >= 450 && moverDelta >= -180) {
    return 'inaccuracy';
  }

  // Missed opportunity / missed win: player had a winning advantage (>= +260cp) or missed a tactical shot and dropped to near equal without blundering into a lost position
  if (
    prevMoverCp >= thresholds.missedWinPrevAdvantageCp &&
    newMoverCp >= -20 &&
    newMoverCp <= 95 &&
    moverDelta <= -160
  ) {
    return 'missed_win';
  }

  if (moverDelta >= -thresholds.inaccuracyMaxLossCp) {
    return 'inaccuracy';
  }

  if (moverDelta >= -thresholds.mistakeMaxLossCp) {
    return 'mistake';
  }

  return 'blunder';
}

/**
 * Returns visual metadata and badge text for each move classification.
 */
export function getClassificationMeta(classification: MoveClassification): {
  label: string;
  badgeText: string;
  colorClass: string;
  bgClass: string;
} {
  switch (classification) {
    case 'brilliant':
      return {
        label: 'Brilliant',
        badgeText: '!!',
        colorClass: 'text-cyan-300',
        bgClass: 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300',
      };
    case 'great':
      return {
        label: 'Great Move',
        badgeText: '!',
        colorClass: 'text-sky-300',
        bgClass: 'bg-sky-500/20 border-sky-400/50 text-sky-300',
      };
    case 'best':
      return {
        label: 'Best Move',
        badgeText: '★',
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300',
      };
    case 'excellent':
      return {
        label: 'Excellent',
        badgeText: '✓',
        colorClass: 'text-teal-300',
        bgClass: 'bg-teal-500/20 border-teal-400/50 text-teal-300',
      };
    case 'good':
      return {
        label: 'Good Move',
        badgeText: '👍',
        colorClass: 'text-green-400',
        bgClass: 'bg-green-500/20 border-green-400/40 text-green-300',
      };
    case 'inaccuracy':
      return {
        label: 'Inaccuracy',
        badgeText: '?!',
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-500/20 border-amber-400/50 text-amber-300',
      };
    case 'missed_win':
      return {
        label: 'Missed Opportunity',
        badgeText: '⚡',
        colorClass: 'text-yellow-300',
        bgClass: 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300',
      };
    case 'mistake':
      return {
        label: 'Mistake',
        badgeText: '?',
        colorClass: 'text-orange-400',
        bgClass: 'bg-orange-500/20 border-orange-400/50 text-orange-300',
      };
    case 'blunder':
      return {
        label: 'Blunder',
        badgeText: '??',
        colorClass: 'text-rose-400',
        bgClass: 'bg-rose-500/20 border-rose-500/50 text-rose-300',
      };
  }
}

/**
 * Computes overall CAPS-style accuracy percentage (0-100) for a list of moves of a given color.
 */
export function calculateColorAccuracy(moves: GameMove[], color: 'w' | 'b'): number {
  const playerMoves = moves.filter((m) => m.color === color);
  if (playerMoves.length === 0) return 100;

  let totalScore = 0;
  for (const m of playerMoves) {
    switch (m.classification) {
      case 'brilliant':
      case 'great':
      case 'best':
        totalScore += 100;
        break;
      case 'excellent':
        totalScore += 96;
        break;
      case 'good':
        totalScore += 92;
        break;
      case 'inaccuracy':
        totalScore += 72;
        break;
      case 'missed_win':
        totalScore += 58;
        break;
      case 'mistake':
        totalScore += 45;
        break;
      case 'blunder':
        totalScore += 15;
        break;
      default:
        totalScore += 88;
        break;
    }
  }

  return Math.max(25, Math.min(99, Math.round(totalScore / playerMoves.length)));
}

/**
 * Identifies the chess opening played based on the SAN move history.
 */
export function identifyOpeningFromMoves(moves: Array<{ san: string }>): {
  eco: string;
  name: string;
} {
  if (!moves || moves.length === 0) {
    return { eco: 'A00', name: 'Starting Position' };
  }

  const sanList = moves.map((m) => m.san.replace(/[+#]/g, ''));

  let bestMatch: { eco: string; name: string; matchedPlies: number } | null = null;

  for (const opening of CHESS_OPENINGS) {
    let matched = 0;
    for (let i = 0; i < Math.min(sanList.length, opening.moves.length); i++) {
      if (sanList[i] === opening.moves[i].replace(/[+#]/g, '')) {
        matched++;
      } else {
        break;
      }
    }
    if (matched >= 2 && (!bestMatch || matched > bestMatch.matchedPlies)) {
      bestMatch = {
        eco: opening.eco,
        name: opening.name,
        matchedPlies: matched,
      };
    }
  }

  if (bestMatch) {
    return { eco: bestMatch.eco, name: bestMatch.name };
  }

  // Common 1st/2nd move fallbacks
  const first = sanList[0];
  const second = sanList[1];
  if (first === 'e4') {
    if (second === 'e5') return { eco: 'C20', name: "King's Pawn Game" };
    if (second === 'c5') return { eco: 'B20', name: 'Sicilian Defense' };
    if (second === 'e6') return { eco: 'C00', name: 'French Defense' };
    if (second === 'c6') return { eco: 'B10', name: 'Caro-Kann Defense' };
    if (second === 'd5') return { eco: 'B01', name: 'Scandinavian Defense' };
    return { eco: 'B00', name: "King's Pawn Opening" };
  }
  if (first === 'd4') {
    if (second === 'd5') return { eco: 'D00', name: "Queen's Pawn Game" };
    if (second === 'Nf6') return { eco: 'A45', name: 'Indian Defense' };
    return { eco: 'A40', name: "Queen's Pawn Opening" };
  }
  if (first === 'c4') return { eco: 'A10', name: 'English Opening' };
  if (first === 'Nf3') return { eco: 'A04', name: 'Réti Opening' };

  return { eco: 'A00', name: 'Uncommon Opening' };
}

/**
 * Identifies critical turning-point plies in a game (evaluation swings >= 150cp, missed wins, or blunders).
 */
export function detectCriticalMoments(moves: GameMove[]): number[] {
  const criticalPlies: number[] = [];
  let prevScore = 0;
  for (let i = 0; i < moves.length; i++) {
    const score = moves[i].evalScore ?? prevScore;
    const delta = Math.abs(score - prevScore);
    const cls = moves[i].classification;
    if (
      delta >= 150 ||
      cls === 'blunder' ||
      cls === 'mistake' ||
      cls === 'missed_win' ||
      cls === 'brilliant'
    ) {
      criticalPlies.push(i);
    }
    prevScore = score;
  }
  return criticalPlies;
}

/**
 * Generates standard PGN string from a list of GameMove records.
 */
export function generatePgnFromMoves(
  moves: GameMove[],
  meta?: {
    white?: string;
    black?: string;
    result?: 'win' | 'loss' | 'draw' | '*';
    playerColor?: 'w' | 'b';
    opening?: string;
  }
): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  const whiteName = meta?.white || 'White';
  const blackName = meta?.black || 'Black';
  let resultTag = '*';
  if (meta?.result === 'draw') resultTag = '1/2-1/2';
  else if (meta?.result === 'win') resultTag = meta?.playerColor === 'b' ? '0-1' : '1-0';
  else if (meta?.result === 'loss') resultTag = meta?.playerColor === 'b' ? '1-0' : '0-1';

  const headers = [
    `[Event "AI Chess Academy Match"]`,
    `[Site "AI Chess Academy"]`,
    `[Date "${dateStr}"]`,
    `[White "${whiteName}"]`,
    `[Black "${blackName}"]`,
    `[Result "${resultTag}"]`,
  ];
  if (meta?.opening) {
    headers.push(`[Opening "${meta.opening}"]`);
  }

  const movePairs: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const wSan = moves[i]?.san || '';
    const bSan = moves[i + 1]?.san || '';
    movePairs.push(bSan ? `${moveNum}. ${wSan} ${bSan}` : `${moveNum}. ${wSan}`);
  }

  return `${headers.join('\n')}\n\n${movePairs.join(' ')} ${resultTag}`.trim();
}

/**
 * Generates instant (<5ms) Grandmaster coaching feedback for a move just played.
 */
export function generateInstantMoveAnalysis(params: {
  fenBefore: string;
  fenAfter: string;
  san: string;
  from: Square;
  to: Square;
  moverColor: 'w' | 'b';
  prevEvalWhiteCp: number;
  newEvalWhiteCp: number;
  bestMoveFrom?: Square;
  bestMoveTo?: Square;
}): InstantMoveFeedback {
  const {
    fenBefore,
    fenAfter,
    san,
    from,
    to,
    moverColor,
    prevEvalWhiteCp,
    newEvalWhiteCp,
    bestMoveFrom,
    bestMoveTo,
  } = params;

  const isEngineBestMove = Boolean(
    bestMoveFrom && bestMoveTo && bestMoveFrom === from && bestMoveTo === to
  );

  let bestMoveSan: string | undefined;
  if (bestMoveFrom && bestMoveTo) {
    try {
      const beforeChess = new Chess(fenBefore);
      const m = beforeChess.move({ from: bestMoveFrom, to: bestMoveTo, promotion: 'q' });
      if (m) bestMoveSan = m.san;
    } catch {
      // Ignore
    }
  }

  const afterChess = new Chess(fenAfter);
  const isCheckmate = afterChess.isCheckmate();
  const isCheck = afterChess.inCheck();
  const isCapture = san.includes('x');
  const isCastle = san.includes('O-O');
  const isCenterSquare = ['d4', 'd5', 'e4', 'e5'].includes(to);

  const classification = classifyMove(
    prevEvalWhiteCp,
    newEvalWhiteCp,
    moverColor,
    isEngineBestMove,
    isCheckmate
  );

  const meta = getClassificationMeta(classification);
  const moverDeltaCp =
    moverColor === 'w'
      ? newEvalWhiteCp - prevEvalWhiteCp
      : prevEvalWhiteCp - newEvalWhiteCp;
  const evalDeltaPawns = Number((moverDeltaCp / 100).toFixed(2));

  const headline = `${san} — ${meta.label}`;
  let tacticalNote = '';

  if (isCheckmate) {
    tacticalNote = `Checkmate delivered! ${san} ends the game decisively.`;
  } else if (
    classification === 'brilliant' ||
    classification === 'great' ||
    classification === 'best' ||
    classification === 'excellent'
  ) {
    if (isCastle) {
      tacticalNote = `${san} tucks the King to safety and activates your Rook toward the central files.`;
    } else if (isCapture && isCheck) {
      tacticalNote = `Forcing capture with check! ${san} seizes the initiative and wins tempo.`;
    } else if (isCenterSquare) {
      tacticalNote = `Strong central control on ${to}! Contesting the core squares increases your piece mobility.`;
    } else {
      tacticalNote = `Optimal engine choice (${san}). Harmonizes piece coordination and maintains pressure.`;
    }
  } else if (classification === 'good') {
    if (isCastle) {
      tacticalNote = `Solid King safety with ${san}. Look to connect your Rooks next.`;
    } else if (isCenterSquare) {
      tacticalNote = `${san} fights for central space on ${to}.${
        bestMoveSan && bestMoveSan !== san ? ` Engine also liked ${bestMoveSan}.` : ''
      }`;
    } else {
      tacticalNote = `Solid developing move (${san}).${
        bestMoveSan && bestMoveSan !== san ? ` ${bestMoveSan} was a slightly sharper alternative.` : ''
      }`;
    }
  } else if (classification === 'missed_win') {
    tacticalNote = `Missed tactical opportunity! ${san} lets a winning advantage slip (${evalDeltaPawns} pawns).${
      bestMoveSan ? ` ${bestMoveSan} would have maintained a decisive lead.` : ''
    }`;
  } else if (classification === 'inaccuracy') {
    tacticalNote = `${san} slightly surrenders initiative (${
      evalDeltaPawns > 0 ? `+${evalDeltaPawns}` : evalDeltaPawns
    } pawns).${bestMoveSan ? ` Prefer ${bestMoveSan} for stronger square control.` : ''}`;
  } else if (classification === 'mistake') {
    tacticalNote = `Careful! ${san} drops evaluation by ${Math.abs(
      evalDeltaPawns
    )} pawns and allows tactical counterplay.${
      bestMoveSan ? ` The stronger continuation was ${bestMoveSan}.` : ''
    }`;
  } else {
    tacticalNote = `Critical blunder (${san}, ${evalDeltaPawns} pawns)! This leaves material or king safety vulnerable.${
      bestMoveSan ? ` ${bestMoveSan} was required to hold the position.` : ''
    }`;
  }

  return {
    classification,
    label: meta.label,
    colorClass: meta.colorClass,
    badgeText: meta.badgeText,
    evalDeltaPawns,
    headline,
    tacticalNote,
    bestMoveSan,
    bestMoveUci: bestMoveFrom && bestMoveTo ? { from: bestMoveFrom, to: bestMoveTo } : undefined,
  };
}
