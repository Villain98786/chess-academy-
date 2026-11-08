import { Chess, Color, Square } from 'chess.js';
import {
  CoachAvatarReaction,
  CoachExplanation,
  CoachHintLevel,
  CoachState,
  MoveClassificationType,
} from '../types/chess';
import { classifyMove, getClassificationMeta } from './analytics';
import {
  detectForkForMove,
  detectHangingPiece,
  inspectChessPositionAndMove,
  PIECE_NAMES,
} from './coachingKnowledgeBase';
import { chessEngine } from './engine';

export const COACH_STATE_TO_REACTION: Record<CoachState, CoachAvatarReaction> = {
  THINKING: 'thinking',
  TEACHING: 'explaining',
  PRAISING: 'happy',
  WARNING: 'warning',
  EXPLAINING: 'explaining',
  HINTING: 'explaining',
  CELEBRATING: 'celebrating',
  ENCOURAGING: 'idle',
};

const PRAISE_OPENERS = [
  'Excellent!',
  'Strong choice!',
  'Well played!',
  'Sharp positional play!',
];

export class GrandmasterCoachService {
  private openerIndex = 0;
  private lastExplanationKey = '';

  private nextPraiseOpener(): string {
    const opener = PRAISE_OPENERS[this.openerIndex % PRAISE_OPENERS.length];
    this.openerIndex += 1;
    return opener;
  }

  public resetSession(): void {
    this.lastExplanationKey = '';
  }

  /**
   * Initial ready/teaching state at the start of a game or position.
   */
  public createInitialState(
    fen: string,
    playerColor: Color = 'w',
    contextNote?: string
  ): CoachExplanation {
    const board = new Chess(fen);
    const isStart =
      fen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');

    const speechBubble = contextNote
      ? contextNote
      : isStart
      ? `You are playing as ${
          playerColor === 'w' ? 'White' : 'Black'
        }. Focus on controlling the center squares (e4, d4, e5, d5), developing your knights and bishops, and castling early.`
      : `Examine the current board geometry (${
          board.turn() === 'w' ? 'White' : 'Black'
        } to move). Look for checks, captures, and ways to improve your least active piece.`;

    return {
      id: `init-${Date.now()}`,
      state: 'TEACHING',
      reaction: 'idle',
      headline: 'GM Elena • Opening & Position Guidance',
      speechBubble,
      detailedExplanation:
        'Every move you and your opponent play is analyzed in real time by the UCI engine. Request a 3-step progressive hint anytime if you get stuck.',
      conceptTag: 'Opening Principles & Center Control',
      recommendedLessonId: 'beg-1',
      recommendedCourseId: 'beginner',
      fen,
      moveCount: 0,
      shouldSpeak: false,
    };
  }

  /**
   * Thinking state while the engine or coach is analyzing.
   */
  public createThinkingState(fen: string, moveCount: number): CoachExplanation {
    return {
      id: `think-${Date.now()}`,
      state: 'THINKING',
      reaction: 'thinking',
      headline: 'GM Elena is analyzing the position...',
      speechBubble: 'Evaluating candidate variations, tactical threats, and piece coordination...',
      detailedExplanation:
        'Running alpha-beta search in the background Web Worker to verify tactical lines.',
      fen,
      moveCount,
      shouldSpeak: false,
    };
  }

  /**
   * Analyzes a move made by the USER and produces a verified, position-specific Grandmaster Coach explanation.
   */
  public analyzeUserMove(params: {
    fenBefore: string;
    fenAfter: string;
    san: string;
    from: Square;
    to: Square;
    moverColor: Color;
    prevEvalWhiteCp: number;
    newEvalWhiteCp: number;
    bestMoveFrom?: Square;
    bestMoveTo?: Square;
    moveCount: number;
    pv?: string[];
  }): CoachExplanation {
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
      moveCount,
      pv,
    } = params;

    const beforeChess = new Chess(fenBefore);
    const afterChess = new Chess(fenAfter);
    const isCheckmate = afterChess.isCheckmate();
    const isCheck = afterChess.inCheck();

    let bestMoveSan: string | undefined;
    if (bestMoveFrom && bestMoveTo) {
      try {
        const sim = new Chess(fenBefore);
        const bm = sim.move({ from: bestMoveFrom, to: bestMoveTo, promotion: 'q' });
        if (bm) bestMoveSan = bm.san;
      } catch {
        // Ignore
      }
    }

    const isEngineBestMove = Boolean(
      !bestMoveFrom || !bestMoveTo || (bestMoveFrom === from && bestMoveTo === to)
    );

    const inspection = inspectChessPositionAndMove({
      fenBefore,
      fenAfter,
      san,
      from,
      to,
      moverColor,
      bestMoveFrom,
      bestMoveTo,
    });

    // Check if the user's move was a sacrifice that maintained/gained evaluation
    const moverDeltaCp =
      moverColor === 'w'
        ? newEvalWhiteCp - prevEvalWhiteCp
        : prevEvalWhiteCp - newEvalWhiteCp;
    const evalDeltaPawns = Number((moverDeltaCp / 100).toFixed(2));

    let classification: MoveClassificationType = classifyMove(
      prevEvalWhiteCp,
      newEvalWhiteCp,
      moverColor,
      isEngineBestMove,
      isCheckmate,
      false
    );

    // If a high-value piece (Queen/Rook/Minor) is left hanging for free, ensure it's flagged as a blunder/mistake
    if (
      inspection.hangingPiece &&
      !isCheckmate &&
      (inspection.hangingPiece.piece === 'q' || inspection.hangingPiece.piece === 'r') &&
      classification !== 'blunder'
    ) {
      classification = 'blunder';
    }

    // If the user missed a clear Knight Fork or Double Attack that was the best move, flag as missed_win or mistake
    const missedFork =
      !isEngineBestMove &&
      bestMoveFrom &&
      bestMoveTo &&
      detectForkForMove(fenBefore, bestMoveFrom, bestMoveTo);

    if (
      missedFork &&
      (classification === 'good' || classification === 'inaccuracy')
    ) {
      classification = 'missed_win';
    }

    const meta = getClassificationMeta(classification);
    const movedPieceType = afterChess.get(to)?.type || beforeChess.get(from)?.type || 'p';
    const movedPieceName = PIECE_NAMES[movedPieceType];

    let state: CoachState = 'TEACHING';
    let headline = `${san} • ${meta.label}`;
    let speechBubble = '';
    let detailedExplanation = '';
    let shouldSpeak = false;

    // 1. CHECKMATE OR FORCED MATING SEQUENCE (Example 5)
    if (isCheckmate || (moverColor === 'w' ? newEvalWhiteCp >= 90000 : newEvalWhiteCp <= -90000)) {
      state = 'CELEBRATING';
      shouldSpeak = true;
      headline = isCheckmate
        ? `Checkmate Delivered (${san})!`
        : `Forced Mating Sequence (${san})!`;
      speechBubble = isCheckmate
        ? `Brilliant combination! You delivered checkmate with ${san}. That's excellent tactical awareness.`
        : `Brilliant combination! You identified the forced mating sequence with ${san}. That's excellent tactical awareness.`;
      detailedExplanation = `Your pieces coordinated harmoniously to eliminate every escape square around the opponent's king.`;
    }
    // 2. HANGING PIECE / BLUNDER (Example 2)
    else if (
      inspection.hangingPiece &&
      (classification === 'blunder' || classification === 'mistake')
    ) {
      state = 'WARNING';
      shouldSpeak = true;
      const hp = inspection.hangingPiece;
      headline = `Tactical Warning • ${hp.pieceName.toUpperCase()} Exposed on ${hp.square}`;
      speechBubble = `Careful! Your ${hp.pieceName} on ${hp.square} is under attack. Your opponent can capture it with ${hp.attackerSan}. Always check your opponent's threats before moving.`;
      detailedExplanation = `${san} left your ${hp.pieceName} on ${hp.square} insufficiently defended.${
        bestMoveSan ? ` Playing ${bestMoveSan} instead kept your material safe.` : ''
      }`;
    }
    // 3. MISSED FORK OR DOUBLE ATTACK (Example 3)
    else if (missedFork) {
      state = 'ENCOURAGING';
      shouldSpeak = true;
      const targetsText = missedFork.attackedTargets
        .slice(0, 2)
        .map((t) => `${t.pieceName} on ${t.square}`)
        .join(' and ');
      const attackerName = PIECE_NAMES[missedFork.attackerPiece];
      headline = `Missed Tactic • ${missedFork.moveSan} Double Attack`;
      speechBubble = `You missed an interesting tactical opportunity. Your ${attackerName} could play ${missedFork.moveSan} to attack the ${targetsText} simultaneously. Let's examine this position.`;
      detailedExplanation = `Double attacks and forks force the opponent to defend two critical threats at once, winning material on the next turn.`;
    }
    // 4. USER EXECUTED A FORK / DOUBLE ATTACK
    else if (
      inspection.forkOpportunity &&
      inspection.forkOpportunity.from === from &&
      inspection.forkOpportunity.to === to
    ) {
      state = 'PRAISING';
      shouldSpeak = true;
      const targetsText = inspection.forkOpportunity.attackedTargets
        .slice(0, 2)
        .map((t) => `${t.pieceName} on ${t.square}`)
        .join(' and ');
      speechBubble = `Sharp tactical strike! ${san} creates a double attack against the opponent's ${targetsText}.`;
      detailedExplanation = `Simultaneous attacks overload the opponent's defense so they cannot rescue both targets in a single turn.`;
    }
    // 5. STRONG OPENING / GOOD MOVE / EXCELLENT / BEST (Example 1)
    else if (
      classification === 'brilliant' ||
      classification === 'great' ||
      classification === 'best' ||
      classification === 'excellent' ||
      classification === 'good'
    ) {
      state =
        classification === 'brilliant' ||
        classification === 'great' ||
        classification === 'best'
          ? 'PRAISING'
          : 'TEACHING';
      shouldSpeak = classification === 'brilliant' || classification === 'great';
      const opener = this.nextPraiseOpener();

      if (inspection.isCastling) {
        speechBubble = `${opener} Castling (${san}) tucks your king into safety behind a pawn shield and activates your rook toward the central files.`;
        detailedExplanation =
          'King safety is one of the three golden opening rules. Now look to connect your roooks and contest open files.';
      } else if (inspection.isMinorPieceDevelopment && movedPieceType === 'n') {
        const centerList =
          inspection.centralSquaresControlled.length > 0
            ? ` (${inspection.centralSquaresControlled.join(', ')})`
            : '';
        speechBubble = `Excellent! You're developing your knight with ${san} and controlling important central squares${centerList}. This is a fundamental opening principle.`;
        detailedExplanation =
          'Knights belong toward the center early in the game where they control up to 8 squares and support central pawn tension.';
      } else if (inspection.isMinorPieceDevelopment && movedPieceType === 'b') {
        speechBubble = `${opener} Developing your bishop with ${san} places it on an active diagonal${
          inspection.targetsWeakKingSquare
            ? ` and eyes the vulnerable ${inspection.targetsWeakKingSquare} square`
            : ''
        }.`;
        detailedExplanation =
          'Developing minor pieces rapidly prepares castling and builds long-range pressure across the center.';
      } else if (
        movedPieceType === 'p' &&
        ['d4', 'e4', 'd5', 'e5'].includes(to)
      ) {
        speechBubble = `${opener} ${san} stakes a strong claim in the center and opens diagonals for your bishop and queen.`;
        detailedExplanation =
          'Occupying the center restricts your opponent’s pieces and gives your army room to maneuver.';
      } else if (isCheck) {
        speechBubble = `${opener} ${san} delivers a forcing check and seizes the initiative.`;
        detailedExplanation =
          'Forcing moves limit the opponent’s legal replies and help you dictate the tempo of the position.';
      } else {
        speechBubble = `${opener} ${san} maintains strong piece coordination and keeps your position harmonious.`;
        detailedExplanation = bestMoveSan && bestMoveSan !== san
          ? `The engine also considered ${bestMoveSan}, while your move ${san} keeps solid control.`
          : `You found the top engine continuation (${san}).`;
      }
    }
    // 6. INACCURACY / MISSED OPPORTUNITY / MISTAKE / BLUNDER
    else {
      state = classification === 'blunder' ? 'WARNING' : 'ENCOURAGING';
      shouldSpeak = classification === 'blunder' || classification === 'mistake';
      if (classification === 'missed_win') {
        speechBubble = `You had a winning tactical continuation here! ${
          bestMoveSan
            ? `Playing ${bestMoveSan} would have pressed your advantage decisively.`
            : `${san} lets the opponent equalize.`
        }`;
      } else if (classification === 'blunder' || classification === 'mistake') {
        speechBubble = `Careful—${san} drops ${Math.abs(
          evalDeltaPawns
        )} pawns of evaluation.${
          bestMoveSan
            ? ` ${bestMoveSan} was the stronger way to defend your position and maintain coordination.`
            : ''
        }`;
      } else {
        speechBubble = `${san} is playable, though ${
          bestMoveSan || 'an active central developing move'
        } offered slightly better square control.`;
      }
      detailedExplanation = pv && pv.length > 0
        ? `Engine continuation line: ${pv.slice(0, 4).join(' ')}.`
        : 'Before committing to a move, always check whether any of your pieces are undefended and compare your top two candidate moves.';
    }

    return {
      id: `usr-${moveCount}-${san}-${Date.now()}`,
      state,
      reaction: COACH_STATE_TO_REACTION[state],
      headline,
      speechBubble,
      detailedExplanation,
      tacticalMotif: inspection.forkOpportunity ? 'Fork / Double Attack' : undefined,
      conceptTag: inspection.conceptTag,
      recommendedLessonId: inspection.recommendedLessonId,
      recommendedCourseId: inspection.recommendedCourseId,
      moveSan: san,
      classification,
      evalDeltaPawns,
      bestAlternativeSan: bestMoveSan,
      bestAlternativeUci:
        bestMoveFrom && bestMoveTo ? { from: bestMoveFrom, to: bestMoveTo } : undefined,
      threatSquare: inspection.hangingPiece?.square,
      threatMoveSan: inspection.hangingPiece?.attackerSan,
      fen: fenAfter,
      moveCount,
      shouldSpeak,
    };
  }

  /**
   * Analyzes a move made by the COMPUTER OPPONENT (PART 7: Live Coaching During Opponent Moves).
   * Explains the strategic purpose of the move, highlights immediate threats, attacked pieces, and defensive requirements.
   */
  public analyzeOpponentMove(params: {
    fenBefore: string;
    fenAfter: string;
    san: string;
    from: Square;
    to: Square;
    opponentColor: Color;
    evalWhiteCp: number;
    moveCount: number;
  }): CoachExplanation {
    const {
      fenBefore,
      fenAfter,
      san,
      from,
      to,
      opponentColor,
      moveCount,
    } = params;

    const playerColor: Color = opponentColor === 'w' ? 'b' : 'w';
    const opponentName = opponentColor === 'w' ? 'White' : 'Black';
    const afterChess = new Chess(fenAfter);
    const isCheckmate = afterChess.isCheckmate();
    const isCheck = afterChess.inCheck();

    const inspection = inspectChessPositionAndMove({
      fenBefore,
      fenAfter,
      san,
      from,
      to,
      moverColor: opponentColor,
    });

    const movedPieceType = afterChess.get(to)?.type || 'p';
    const movedPieceName = PIECE_NAMES[movedPieceType];

    // Check if any of the USER'S valuable pieces are now threatened after the computer's move
    const threatenedUserPiece = detectHangingPiece(fenAfter, playerColor);

    let state: CoachState = 'EXPLAINING';
    let headline = `Opponent Played ${san}`;
    let speechBubble = '';
    let detailedExplanation = '';
    let shouldSpeak = false;

    if (isCheckmate) {
      state = 'ENCOURAGING';
      shouldSpeak = true;
      headline = `Checkmate by ${opponentName} (${san})`;
      speechBubble = `${opponentName} delivered checkmate with ${san}. Don't be discouraged—let's review the critical turning point in Game Analysis so you can spot this pattern next time.`;
      detailedExplanation =
        'Reviewing the 2–3 moves leading up to checkmate is the fastest way to strengthen your defensive radar.';
    } else if (isCheck) {
      state = 'WARNING';
      shouldSpeak = true;
      headline = `King in Check! (${san})`;
      speechBubble = `${opponentName} played ${san}, placing your king in check! Remember the three ways out of check: move your king to a safe square, block the attack, or capture the checking piece.`;
      detailedExplanation =
        'When in check, you must resolve the threat immediately before continuing your own plan.';
    } else if (
      movedPieceType === 'b' &&
      inspection.targetsWeakKingSquare
    ) {
      // Matches PART 6 Example 4: "Computer plays Bc5 -> Black is developing the bishop and targeting your f2 square..."
      state = 'WARNING';
      shouldSpeak = true;
      headline = `${opponentName} Played ${san} • Targeting ${inspection.targetsWeakKingSquare}`;
      speechBubble = `${opponentName} is developing the bishop with ${san} and targeting your ${inspection.targetsWeakKingSquare} square. Be careful about early attacks against your king.`;
      detailedExplanation = `The ${inspection.targetsWeakKingSquare} pawn is initially defended only by your king. Developing your knights and castling early neutralizes threats along this diagonal.`;
    } else if (threatenedUserPiece) {
      state = 'WARNING';
      shouldSpeak = true;
      headline = `Immediate Threat • Your ${threatenedUserPiece.pieceName} on ${threatenedUserPiece.square}`;
      speechBubble = `Watch out! With ${san}, ${opponentName} threatens your ${threatenedUserPiece.pieceName} on ${threatenedUserPiece.square} (via ${threatenedUserPiece.attackerSan}). Consider moving, defending, or counter-attacking.`;
      detailedExplanation = `Always ask "What is my opponent threatening?" after every move they play.`;
    } else if (inspection.attackedEnemySquares.length > 0) {
      const topTarget = inspection.attackedEnemySquares[0];
      state = 'EXPLAINING';
      headline = `${opponentName} Played ${san} • Pressuring ${topTarget.square}`;
      speechBubble = `${opponentName} played ${san}, activating their ${movedPieceName} and putting pressure on your ${topTarget.pieceName} on ${topTarget.square}. Verify that ${topTarget.square} is adequately defended.`;
      detailedExplanation = `You can respond by reinforcing ${topTarget.square}, moving the attacked ${topTarget.pieceName}, or developing a piece with tempo.`;
    } else if (inspection.isCastling) {
      state = 'EXPLAINING';
      headline = `${opponentName} Castled (${san})`;
      speechBubble = `${opponentName} castled (${san}) to tuck their king to safety and bring their rook toward the center. Make sure your own king is safe and your rooks are connected.`;
      detailedExplanation =
        'Once both kings are castled, the game transitions into the middlegame—look for central pawn breaks and outposts.';
    } else if (inspection.isMinorPieceDevelopment) {
      state = 'EXPLAINING';
      headline = `${opponentName} Developed with ${san}`;
      speechBubble = `${opponentName} played ${san} to develop their ${movedPieceName} toward the center. Continue developing your own pieces and fighting for central squares.`;
      detailedExplanation =
        'Match your opponent’s development speed so they cannot seize a lead in activity.';
    } else if (
      movedPieceType === 'p' &&
      ['d4', 'e4', 'd5', 'e5'].includes(to)
    ) {
      state = 'EXPLAINING';
      headline = `${opponentName} Contests the Center (${san})`;
      speechBubble = `${opponentName} advanced ${san} to fight for central space on ${to}. Develop your minor pieces to pressure their central pawns.`;
      detailedExplanation =
        'Central pawn tension defines the opening structure—keep your pieces supporting d4, e4, d5, and e5.';
    } else {
      state = 'EXPLAINING';
      headline = `Opponent Played ${san}`;
      speechBubble = `${opponentName} played ${san} with their ${movedPieceName}. Look for ways to improve your piece activity and check for forcing captures or threats before moving.`;
      detailedExplanation =
        'Ask yourself: Did my opponent’s last move leave any square or piece undefended?';
    }

    return {
      id: `opp-${moveCount}-${san}-${Date.now()}`,
      state,
      reaction: COACH_STATE_TO_REACTION[state],
      headline,
      speechBubble,
      detailedExplanation,
      conceptTag: inspection.conceptTag,
      recommendedLessonId: inspection.recommendedLessonId,
      recommendedCourseId: inspection.recommendedCourseId,
      moveSan: san,
      threatSquare: threatenedUserPiece?.square,
      threatMoveSan: threatenedUserPiece?.attackerSan,
      fen: fenAfter,
      moveCount,
      shouldSpeak,
    };
  }

  /**
   * Generates a 3-Level Progressive Interactive Hint (PART 8) for the current position.
   * Level 1: Strategic Hint
   * Level 2: Tactical Hint (specific piece & motif)
   * Level 3: Best Move (reveals exact move + arrow)
   */
  public generateProgressiveHint(
    fen: string,
    level: CoachHintLevel,
    moveCount: number = 0
  ): CoachExplanation {
    const board = new Chess(fen);
    const turnColor = board.turn();
    const candidates = chessEngine.computeQuickCandidates(fen, 2);
    const best = candidates[0];

    if (!best) {
      return {
        id: `hint-none-${Date.now()}`,
        state: 'HINTING',
        reaction: 'explaining',
        headline: 'No Legal Moves Available',
        speechBubble: 'The game has already concluded in this position.',
        detailedExplanation: 'Start a new game or undo to continue practicing.',
        hintLevel: level,
        fen,
        moveCount,
        shouldSpeak: false,
      };
    }

    const pieceOnFrom = board.get(best.from);
    const pieceName = pieceOnFrom ? PIECE_NAMES[pieceOnFrom.type] : 'piece';
    const isCapture = best.san.includes('x');
    const isCheck = best.san.includes('+');
    const isCastle = best.san.includes('O-O');
    const isCenterTarget = ['d4', 'e4', 'd5', 'e5'].includes(best.to);
    const forkInfo = detectForkForMove(fen, best.from, best.to);

    if (level === 1) {
      // LEVEL 1: Strategic Hint (Never reveals exact move or piece square)
      let strategicText =
        'Look for a way to improve your piece activity and contest the key central squares.';
      if (board.inCheck()) {
        strategicText =
          'Your king is in check! Prioritize king safety by finding the safest escape, block, or capture.';
      } else if (isCastle) {
        strategicText =
          'Your king is still in the center. Look for a way to safeguard your king and activate your rook simultaneously.';
      } else if (forkInfo || isCapture) {
        strategicText =
          'There is an undefended or tactically vulnerable target in your opponent’s camp. Scan for forcing captures and double attacks.';
      } else if (isCenterTarget) {
        strategicText =
          'Focus on central control and piece development—bringing a piece toward the center will strengthen your position.';
      }

      return {
        id: `hint-l1-${Date.now()}`,
        state: 'HINTING',
        reaction: 'explaining',
        headline: 'Hint Level 1 of 3 • Strategic Guidance',
        speechBubble: strategicText,
        detailedExplanation:
          'Need a more specific clue? Click the Hint button again for Level 2 (Tactical Clue) or Level 3 (Best Move Arrow).',
        hintLevel: 1,
        fen,
        moveCount,
        shouldSpeak: true,
      };
    }

    if (level === 2) {
      // LEVEL 2: Tactical Hint (Identifies the piece type / origin square & tactical motif without giving the destination square away)
      let tacticalText = `Focus on your ${pieceName} on ${best.from}—look for an active square where it increases pressure.`;
      if (forkInfo) {
        const targets = forkInfo.attackedTargets
          .slice(0, 2)
          .map((t) => t.pieceName)
          .join(' and ');
        tacticalText = `Check whether your ${pieceName} on ${best.from} can create a double attack against the opponent's ${targets}!`;
      } else if (isCastle) {
        tacticalText = `Look at your king on ${best.from}—can you castle right now to secure your king and activate your rook?`;
      } else if (isCapture && isCheck) {
        tacticalText = `Your ${pieceName} on ${best.from} has a forcing capture that also delivers check!`;
      } else if (isCapture) {
        tacticalText = `Examine captures with your ${pieceName} on ${best.from} to win material or improve central control.`;
      } else if (isCheck) {
        tacticalText = `Look for a checking move with your ${pieceName} on ${best.from} to seize the initiative.`;
      }

      return {
        id: `hint-l2-${Date.now()}`,
        state: 'HINTING',
        reaction: 'explaining',
        headline: `Hint Level 2 of 3 • Tactical Clue (${pieceName.toUpperCase()} on ${best.from})`,
        speechBubble: tacticalText,
        detailedExplanation:
          'Click Hint once more for Level 3 to reveal the exact destination square and draw the Best Move arrow on the board.',
        hintLevel: 2,
        fen,
        moveCount,
        shouldSpeak: true,
      };
    }

    // LEVEL 3: Best Move (Reveals exact move + arrow + explanation)
    const evalFormatted = chessEngine.formatScore(
      turnColor === 'w' ? best.scoreCp : -best.scoreCp
    );
    let reason = `it optimizes your ${pieceName}'s activity and maintains an evaluation of ${evalFormatted}.`;
    if (forkInfo) {
      reason = `it forks multiple opponent targets simultaneously!`;
    } else if (isCastle) {
      reason = `it castles your king to safety and brings your rook into the game.`;
    } else if (isCapture) {
      reason = `it captures key material and improves your board control.`;
    } else if (isCenterTarget) {
      reason = `it develops toward the center and controls key squares around ${best.to}.`;
    }

    return {
      id: `hint-l3-${Date.now()}`,
      state: 'HINTING',
      reaction: 'happy',
      headline: `Hint Level 3 of 3 • Best Move: ${best.san}`,
      speechBubble: `Play ${best.san} (${best.from} → ${best.to})! The engine recommends this move because ${reason}`,
      detailedExplanation:
        candidates.length > 1
          ? `Alternative candidate: ${candidates[1].san} (${chessEngine.formatScore(
              candidates[1].scoreCp
            )}). The green arrow on the board highlights ${best.san}.`
          : `The green arrow on the chessboard highlights ${best.from} → ${best.to}.`,
      bestAlternativeSan: best.san,
      bestAlternativeUci: { from: best.from, to: best.to },
      hintLevel: 3,
      fen,
      moveCount,
      shouldSpeak: true,
    };
  }

  /**
   * Explains the overall strategic & positional plan in the current position on user request.
   */
  public explainPositionPlan(fen: string, moveCount: number = 0): CoachExplanation {
    const board = new Chess(fen);
    const turnColor = board.turn();
    const sideName = turnColor === 'w' ? 'White' : 'Black';
    const evalWhite = chessEngine.evaluatePosition(board);
    const candidates = chessEngine.computeQuickCandidates(fen, 2);
    const hanging = detectHangingPiece(fen, turnColor);

    let phase = 'Opening';
    if (moveCount >= 20) phase = 'Middlegame';
    if (moveCount >= 52) phase = 'Endgame';

    let planBubble = `In this ${phase.toLowerCase()} position (${sideName} to move, Eval ${chessEngine.formatScore(
      evalWhite
    )}), `;

    if (hanging) {
      planBubble += `your immediate priority is defending your ${hanging.pieceName} on ${hanging.square}, which is threatened by ${hanging.attackerSan}.`;
    } else if (phase === 'Opening') {
      planBubble += `prioritize rapid minor-piece development, fighting for the center (d4, e4, d5, e5), and castling your king to safety.`;
    } else if (phase === 'Middlegame') {
      planBubble += `look to place your rooks on open files, anchor knights on central outposts, and scan for forcing checks and captures.`;
    } else {
      planBubble += `activate your king toward the center and advance passed pawns with rook support.`;
    }

    const candSummary =
      candidates.length > 0
        ? `Top candidate ideas: ${candidates.map((c) => c.san).join(', ')}.`
        : '';

    return {
      id: `plan-${Date.now()}`,
      state: 'TEACHING',
      reaction: 'explaining',
      headline: `${phase} Strategic Plan • ${sideName} to Move`,
      speechBubble: planBubble,
      detailedExplanation: `${candSummary} Remember to check your opponent's forcing threats before executing your plan.`,
      fen,
      moveCount,
      shouldSpeak: true,
    };
  }
}

export const grandmasterCoach = new GrandmasterCoachService();
