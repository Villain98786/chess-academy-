import { Chess, Color, PieceSymbol, Square } from 'chess.js';
import { CourseLevelId } from '../types/chess';

export const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};

export interface TacticalInspection {
  /** Whether a valuable piece of `moverColor` is left hanging or can be captured profitably */
  hangingPiece?: {
    square: Square;
    piece: PieceSymbol;
    pieceName: string;
    attackerSan: string;
    attackerFrom: Square;
  };
  /** Whether the move that was played (or best move that was missed) is a Knight Fork or Double Attack */
  forkOpportunity?: {
    moveSan: string;
    from: Square;
    to: Square;
    attackerPiece: PieceSymbol;
    attackedTargets: Array<{ square: Square; piece: PieceSymbol; pieceName: string }>;
  };
  /** Pieces of the opponent that are newly attacked by the move played */
  attackedEnemySquares: Array<{ square: Square; piece: PieceSymbol; pieceName: string }>;
  /** Whether the move targets f2 or f7 weak king squares */
  targetsWeakKingSquare?: 'f2' | 'f7';
  /** Whether the move develops a minor piece in the opening */
  isMinorPieceDevelopment: boolean;
  /** Whether the move controls central squares (d4, e4, d5, e5) */
  centralSquaresControlled: Square[];
  /** Whether the move is castling */
  isCastling: boolean;
  /** Curriculum lesson mapping */
  conceptTag: string;
  recommendedLessonId: string;
  recommendedCourseId: CourseLevelId;
}

const CENTER_SQUARES: Square[] = ['d4', 'e4', 'd5', 'e5'];

/**
 * Returns all squares attacked by the piece standing on `sq` in the given `fen`.
 */
export function getSquaresAttackedByPieceAt(fen: string, sq: Square, color: Color): Square[] {
  try {
    const parts = fen.split(' ');
    parts[1] = color;
    parts[3] = '-';
    const sim = new Chess(parts.join(' '));
    const moves = sim.moves({ square: sq, verbose: true });
    const targets = new Set<Square>();
    for (const m of moves) {
      targets.add(m.to as Square);
    }
    return Array.from(targets);
  } catch {
    return [];
  }
}

/**
 * Checks if any valuable piece (Queen, Rook, Bishop, Knight) belonging to `ownerColor`
 * is under immediate profitable capture by the side to move in `fenAfter`.
 */
export function detectHangingPiece(
  fenAfter: string,
  ownerColor: Color
): TacticalInspection['hangingPiece'] | undefined {
  try {
    const board = new Chess(fenAfter);
    if (board.turn() === ownerColor) {
      const parts = fenAfter.split(' ');
      parts[1] = ownerColor === 'w' ? 'b' : 'w';
      parts[3] = '-';
      board.load(parts.join(' '));
    }

    const oppMoves = board.moves({ verbose: true });
    let worstHanging:
      | {
          square: Square;
          piece: PieceSymbol;
          pieceName: string;
          attackerSan: string;
          attackerFrom: Square;
          netGain: number;
        }
      | undefined;

    for (const m of oppMoves) {
      if (!m.captured) continue;
      const targetVal = PIECE_VALUES[m.captured as PieceSymbol] || 0;
      if (targetVal < 3) continue; // Focus on minor pieces, rooks, and queens

      const attackerVal = PIECE_VALUES[m.piece as PieceSymbol] || 1;
      board.move(m);
      // Check if owner can recapture on m.to
      const recaptureMoves = board
        .moves({ verbose: true })
        .filter((r) => r.to === m.to);
      board.undo();

      const isUndefended = recaptureMoves.length === 0;
      const netGain = isUndefended ? targetVal : targetVal - attackerVal;

      if (netGain >= 2) {
        if (!worstHanging || netGain > worstHanging.netGain || targetVal > PIECE_VALUES[worstHanging.piece]) {
          worstHanging = {
            square: m.to as Square,
            piece: m.captured as PieceSymbol,
            pieceName: PIECE_NAMES[m.captured as PieceSymbol],
            attackerSan: m.san,
            attackerFrom: m.from as Square,
            netGain,
          };
        }
      }
    }

    if (!worstHanging) return undefined;
    return {
      square: worstHanging.square,
      piece: worstHanging.piece,
      pieceName: worstHanging.pieceName,
      attackerSan: worstHanging.attackerSan,
      attackerFrom: worstHanging.attackerFrom,
    };
  } catch {
    return undefined;
  }
}

/**
 * Checks whether executing `{ from, to }` from `fenBefore` creates a Fork / Double Attack
 * against two or more valuable enemy pieces (King, Queen, Rook, or undefended minor pieces).
 */
export function detectForkForMove(
  fenBefore: string,
  from: Square,
  to: Square,
  promotion: string = 'q'
): TacticalInspection['forkOpportunity'] | undefined {
  try {
    const sim = new Chess(fenBefore);
    const moverColor = sim.turn();
    const enemyColor: Color = moverColor === 'w' ? 'b' : 'w';
    const res = sim.move({ from, to, promotion });
    if (!res) return undefined;

    const attackedSqs = getSquaresAttackedByPieceAt(sim.fen(), to, moverColor);
    const valuableTargets: Array<{ square: Square; piece: PieceSymbol; pieceName: string }> = [];

    for (const sq of attackedSqs) {
      const p = sim.get(sq);
      if (p && p.color === enemyColor && PIECE_VALUES[p.type] >= 3) {
        valuableTargets.push({
          square: sq,
          piece: p.type,
          pieceName: PIECE_NAMES[p.type],
        });
      }
    }

    if (valuableTargets.length >= 2) {
      return {
        moveSan: res.san,
        from,
        to,
        attackerPiece: res.piece as PieceSymbol,
        attackedTargets: valuableTargets,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Performs a comprehensive tactical & positional inspection of a move played from `fenBefore` to `fenAfter`.
 */
export function inspectChessPositionAndMove(params: {
  fenBefore: string;
  fenAfter: string;
  san: string;
  from: Square;
  to: Square;
  moverColor: Color;
  bestMoveFrom?: Square;
  bestMoveTo?: Square;
}): TacticalInspection {
  const {
    fenBefore,
    fenAfter,
    san,
    from,
    to,
    moverColor,
    bestMoveFrom,
    bestMoveTo,
  } = params;

  const beforeBoard = new Chess(fenBefore);
  const afterBoard = new Chess(fenAfter);
  const movedPiece = afterBoard.get(to)?.type || beforeBoard.get(from)?.type || 'p';
  const enemyColor: Color = moverColor === 'w' ? 'b' : 'w';

  const attackedSqs = getSquaresAttackedByPieceAt(fenAfter, to, moverColor);
  const centralSquaresControlled = attackedSqs.filter((sq) => CENTER_SQUARES.includes(sq));
  if (CENTER_SQUARES.includes(to) && !centralSquaresControlled.includes(to)) {
    centralSquaresControlled.push(to);
  }

  const attackedEnemySquares: Array<{ square: Square; piece: PieceSymbol; pieceName: string }> = [];
  for (const sq of attackedSqs) {
    const p = afterBoard.get(sq);
    if (p && p.color === enemyColor) {
      attackedEnemySquares.push({
        square: sq,
        piece: p.type,
        pieceName: PIECE_NAMES[p.type],
      });
    }
  }

  let targetsWeakKingSquare: 'f2' | 'f7' | undefined;
  if (moverColor === 'b' && attackedSqs.includes('f2')) {
    targetsWeakKingSquare = 'f2';
  } else if (moverColor === 'w' && attackedSqs.includes('f7')) {
    targetsWeakKingSquare = 'f7';
  }

  const startRank = moverColor === 'w' ? '1' : '8';
  const isMinorPieceDevelopment =
    (movedPiece === 'n' || movedPiece === 'b') &&
    from.endsWith(startRank) &&
    !to.endsWith(startRank);

  const isCastling = san.includes('O-O');
  const hangingPiece = detectHangingPiece(fenAfter, moverColor);

  // Check if the played move itself is a fork, OR if the missed best move was a fork!
  let forkOpportunity = detectForkForMove(fenBefore, from, to);
  if (
    !forkOpportunity &&
    bestMoveFrom &&
    bestMoveTo &&
    (bestMoveFrom !== from || bestMoveTo !== to)
  ) {
    forkOpportunity = detectForkForMove(fenBefore, bestMoveFrom, bestMoveTo);
  }

  // Determine curriculum mapping
  let conceptTag = 'Positional Coordination';
  let recommendedLessonId = 'int-1';
  let recommendedCourseId: CourseLevelId = 'intermediate';

  if (afterBoard.isCheckmate()) {
    conceptTag = 'Checkmate Pattern';
    recommendedLessonId = 'beg-4';
    recommendedCourseId = 'beginner';
  } else if (hangingPiece) {
    conceptTag = 'Piece Safety & Threat Awareness';
    recommendedLessonId = 'beg-3';
    recommendedCourseId = 'beginner';
  } else if (forkOpportunity) {
    conceptTag = 'Knight Fork & Double Attack';
    recommendedLessonId = 'int-2';
    recommendedCourseId = 'intermediate';
  } else if (isCastling) {
    conceptTag = 'King Safety & Castling';
    recommendedLessonId = 'beg-5';
    recommendedCourseId = 'beginner';
  } else if (isMinorPieceDevelopment) {
    conceptTag = 'Piece Development & Center Control';
    recommendedLessonId = 'beg-2';
    recommendedCourseId = 'beginner';
  } else if (CENTER_SQUARES.includes(to) && movedPiece === 'p') {
    conceptTag = 'Central Space & Opening Principles';
    recommendedLessonId = 'beg-1';
    recommendedCourseId = 'beginner';
  } else if (san.includes('+')) {
    conceptTag = 'Forcing Checks & Initiative';
    recommendedLessonId = 'mas-1';
    recommendedCourseId = 'master';
  }

  return {
    hangingPiece,
    forkOpportunity,
    attackedEnemySquares,
    targetsWeakKingSquare,
    isMinorPieceDevelopment,
    centralSquaresControlled,
    isCastling,
    conceptTag,
    recommendedLessonId,
    recommendedCourseId,
  };
}
