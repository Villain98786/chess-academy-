import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessPuzzle } from '../types/chess';

export interface PuzzleValidationResult {
  valid: boolean;
  errors: string[];
  finalFen: string;
  isFinalCheckmate: boolean;
  sanHistory: string[];
}

export interface ExecutedMoveRecord {
  plyIndex: number;
  moveNumber: number;
  actor: 'user' | 'opponent';
  san: string;
  uci: string;
  from: Square;
  to: Square;
  fenAfter: string;
  explanation?: string;
  isCheck: boolean;
  isCheckmate: boolean;
}

export interface OpponentReplyPayload {
  plyIndex: number;
  san: string;
  uci: string;
  from: Square;
  to: Square;
  fenAfterOpponent: string;
  explanation: string;
  isCheck: boolean;
}

export interface PuzzleMoveEvaluation {
  status: 'solved' | 'opponent_turn' | 'wrong' | 'illegal';
  userMove?: {
    san: string;
    uci: string;
    from: Square;
    to: Square;
    fenAfterUser: string;
    isCheck: boolean;
    isCheckmate: boolean;
  };
  opponentReply?: OpponentReplyPayload;
  nextStep: number;
  isCheckmate: boolean;
  wrongReason?: string;
  stepHint?: string;
}

export function isMatePuzzle(puzzle: ChessPuzzle): boolean {
  return (
    Boolean(puzzle.mateDepth && puzzle.mateDepth >= 1) ||
    puzzle.category === 'mate1' ||
    puzzle.category === 'mate2' ||
    puzzle.category === 'mate3' ||
    puzzle.category === 'mate4'
  );
}

function normalizeSan(san: string): string {
  return san.replace(/[+#?!]/g, '').trim();
}

/**
 * Programmatically validates a puzzle's initial FEN, move sequence legality,
 * required moves count, opponent explanations, and final checkmate status.
 */
export function validatePuzzleDefinition(puzzle: ChessPuzzle): PuzzleValidationResult {
  const errors: string[] = [];
  const chess = new Chess();

  try {
    chess.load(puzzle.fen);
  } catch (err) {
    return {
      valid: false,
      errors: [`Invalid FEN in puzzle ${puzzle.id}: ${(err as Error).message}`],
      finalFen: puzzle.fen,
      isFinalCheckmate: false,
      sanHistory: [],
    };
  }

  if (chess.turn() !== puzzle.playerColor) {
    errors.push(
      `Puzzle ${puzzle.id} FEN turn (${chess.turn()}) does not match playerColor (${puzzle.playerColor})`
    );
  }

  if (chess.isGameOver()) {
    errors.push(`Puzzle ${puzzle.id} initial FEN is already game over`);
  }

  const expectedPlyCount = puzzle.requiredMovesCount * 2 - 1;
  if (puzzle.solutionMoves.length !== expectedPlyCount) {
    errors.push(
      `Puzzle ${puzzle.id} requires ${puzzle.requiredMovesCount} user moves (${expectedPlyCount} plies), but solutionMoves has ${puzzle.solutionMoves.length} plies`
    );
  }

  if (isMatePuzzle(puzzle)) {
    const expectedDepth =
      puzzle.category === 'mate1'
        ? 1
        : puzzle.category === 'mate2'
        ? 2
        : puzzle.category === 'mate3'
        ? 3
        : puzzle.category === 'mate4'
        ? puzzle.mateDepth || 4
        : puzzle.mateDepth || puzzle.requiredMovesCount;

    if (puzzle.mateDepth !== expectedDepth) {
      errors.push(
        `Puzzle ${puzzle.id} mateDepth (${puzzle.mateDepth}) does not match expected depth (${expectedDepth})`
      );
    }
    if (puzzle.requiredMovesCount !== expectedDepth) {
      errors.push(
        `Puzzle ${puzzle.id} requiredMovesCount (${puzzle.requiredMovesCount}) does not match mateDepth (${expectedDepth})`
      );
    }
  }

  const sanHistory: string[] = [];

  for (let i = 0; i < puzzle.solutionMoves.length; i++) {
    const moveStr = puzzle.solutionMoves[i];
    try {
      const result = chess.move(moveStr);
      if (!result) {
        errors.push(`Illegal move "${moveStr}" at ply ${i} in puzzle ${puzzle.id}`);
        break;
      }
      sanHistory.push(result.san);

      const isLastPly = i === puzzle.solutionMoves.length - 1;
      if (!isLastPly && chess.isCheckmate()) {
        errors.push(
          `Puzzle ${puzzle.id} reached checkmate prematurely at ply ${i} (${result.san}) before final ply ${puzzle.solutionMoves.length - 1}`
        );
      }

      // Check that opponent replies (odd plies) have an explanation
      if (i % 2 === 1) {
        const oppExp = puzzle.opponentExplanations?.[i];
        if (!oppExp || oppExp.trim().length < 5) {
          errors.push(`Puzzle ${puzzle.id} is missing opponentExplanations for ply ${i} (${result.san})`);
        }
      }
    } catch (err) {
      errors.push(
        `Exception executing move "${moveStr}" at ply ${i} in puzzle ${puzzle.id}: ${(err as Error).message}`
      );
      break;
    }
  }

  const isFinalCheckmate = chess.isCheckmate();
  if (isMatePuzzle(puzzle) && !isFinalCheckmate) {
    errors.push(
      `Mate puzzle ${puzzle.id} (${puzzle.category}) does NOT end in checkmate! Final FEN: ${chess.fen()}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    finalFen: chess.fen(),
    isFinalCheckmate,
    sanHistory,
  };
}

/**
 * Generates a step-aware tactical hint without giving away the entire line at once.
 */
export function getStepHint(puzzle: ChessPuzzle, currentStep: number): string {
  const userMoveNumber = Math.floor(currentStep / 2) + 1;
  const expectedSan = puzzle.solutionMoves[currentStep];
  if (!expectedSan) return puzzle.hint;

  if (currentStep === 0) {
    return puzzle.hint;
  }

  const isFinalStep = currentStep === puzzle.solutionMoves.length - 1;
  if (isFinalStep && isMatePuzzle(puzzle)) {
    return `Move ${userMoveNumber} of ${puzzle.requiredMovesCount}: The opponent's King is trapped! Deliver the final checkmate move now.`;
  }

  return `Move ${userMoveNumber} of ${puzzle.requiredMovesCount}: Keep up the forcing pressure! Look for the continuation that gives the opponent only one defensive reply.`;
}

/**
 * Diagnoses why a user's wrong move fails compared to the expected tactical solution.
 */
export function buildWrongMoveExplanation(
  puzzle: ChessPuzzle,
  fenBeforeMove: string,
  currentStep: number,
  playedSan: string,
  expectedSan: string
): string {
  // Check if puzzle defines a specific explanation for this wrong move
  const customMap = puzzle.wrongMoveExplanations;
  if (customMap) {
    if (customMap[playedSan]) return customMap[playedSan];
    const cleanPlayed = normalizeSan(playedSan);
    for (const [key, val] of Object.entries(customMap)) {
      if (normalizeSan(key) === cleanPlayed) return val;
    }
  }

  const boardForExpected = new Chess(fenBeforeMove);
  const boardForPlayed = new Chess(fenBeforeMove);

  const expectedMoveObj = boardForExpected.move(expectedSan);
  const playedMoveObj = boardForPlayed.move(playedSan);

  if (!expectedMoveObj || !playedMoveObj) {
    return `"${playedSan}" is not the strongest move here. Look carefully at ${puzzle.theme.toLowerCase()}.`;
  }

  const expectedGivesCheck = boardForExpected.inCheck();
  const playedGivesCheck = boardForPlayed.inCheck();
  const expectedIsMate = boardForExpected.isCheckmate();
  const playedIsMate = boardForPlayed.isCheckmate();

  if (expectedIsMate && !playedIsMate) {
    return `${playedMoveObj.san} misses an immediate checkmate in 1! Look for a move that attacks the enemy King while leaving zero escape squares.`;
  }

  if (expectedGivesCheck && !playedGivesCheck) {
    return `${playedMoveObj.san} is too slow because it does not deliver check, giving your opponent time to defend or counterattack. Look for a forcing check!`;
  }

  if (playedGivesCheck && !expectedGivesCheck) {
    return `${playedMoveObj.san} gives check, but the opponent can easily escape or capture your attacking piece without falling into the tactical net.`;
  }

  // See if the opponent can immediately capture on the destination square of playedMoveObj
  const oppMovesAfterPlayed = boardForPlayed.moves({ verbose: true });
  const recaptureOnDest = oppMovesAfterPlayed.find((m) => m.to === playedMoveObj.to);
  if (recaptureOnDest && !expectedMoveObj.captured) {
    return `${playedMoveObj.san} allows the opponent to reply with ${recaptureOnDest.san}, neutralizing your attack and losing the initiative.`;
  }

  if (expectedMoveObj.captured && !playedMoveObj.captured) {
    return `${playedMoveObj.san} overlooks a critical tactical capture that wins material or removes a key defender.`;
  }

  const stepNum = Math.floor(currentStep / 2) + 1;
  return `${playedMoveObj.san} on move ${stepNum} allows the opponent to escape the ${puzzle.theme} sequence. Try another forcing move!`;
}

/**
 * Evaluates a user's candidate move at `currentStep` of `puzzle`.
 * - Never marks a multi-move puzzle solved on move 1.
 * - Verifies actual `chess.isCheckmate()` on the final move of all mate puzzles.
 * - Automatically prepares the opponent's forced response when there are remaining plies.
 */
export function evaluateUserPuzzleMove(
  puzzle: ChessPuzzle,
  currentFen: string,
  currentStep: number,
  moveInput: { from: Square; to: Square; promotion?: PieceSymbol } | string
): PuzzleMoveEvaluation {
  const chess = new Chess();
  try {
    chess.load(currentFen);
  } catch {
    return {
      status: 'illegal',
      nextStep: currentStep,
      isCheckmate: false,
    };
  }

  let executedUserMove;
  try {
    if (typeof moveInput === 'string') {
      executedUserMove = chess.move(moveInput);
    } else {
      executedUserMove = chess.move({
        from: moveInput.from,
        to: moveInput.to,
        promotion: moveInput.promotion || 'q',
      });
    }
  } catch {
    return {
      status: 'illegal',
      nextStep: currentStep,
      isCheckmate: false,
    };
  }

  if (!executedUserMove) {
    return {
      status: 'illegal',
      nextStep: currentStep,
      isCheckmate: false,
    };
  }

  const expectedSan = puzzle.solutionMoves[currentStep];
  if (!expectedSan) {
    return {
      status: 'illegal',
      nextStep: currentStep,
      isCheckmate: false,
    };
  }

  const isFinalStep = currentStep === puzzle.solutionMoves.length - 1;
  const userMoveMatchesExpected =
    normalizeSan(executedUserMove.san) === normalizeSan(expectedSan);

  // On the final step of a mate puzzle, if an alternative move also delivers legal checkmate, allow it
  const isAlternateFinalCheckmate =
    isFinalStep && isMatePuzzle(puzzle) && chess.isCheckmate();

  const userMovePayload = {
    san: executedUserMove.san,
    uci: `${executedUserMove.from}${executedUserMove.to}${executedUserMove.promotion || ''}`,
    from: executedUserMove.from as Square,
    to: executedUserMove.to as Square,
    fenAfterUser: chess.fen(),
    isCheck: chess.inCheck(),
    isCheckmate: chess.isCheckmate(),
  };

  if (!userMoveMatchesExpected && !isAlternateFinalCheckmate) {
    const wrongReason = buildWrongMoveExplanation(
      puzzle,
      currentFen,
      currentStep,
      executedUserMove.san,
      expectedSan
    );
    return {
      status: 'wrong',
      userMove: userMovePayload,
      nextStep: currentStep,
      isCheckmate: false,
      wrongReason,
      stepHint: getStepHint(puzzle, currentStep),
    };
  }

  // User move matches expected!
  // Check if this is the final step of the required solution sequence
  if (isFinalStep) {
    // CRITICAL REQUIREMENT: For mate puzzles, verify actual checkmate via chess.isCheckmate()
    if (isMatePuzzle(puzzle) && !chess.isCheckmate()) {
      return {
        status: 'wrong',
        userMove: userMovePayload,
        nextStep: currentStep,
        isCheckmate: false,
        wrongReason: `${executedUserMove.san} does not result in checkmate! Verify all escape squares of the enemy King.`,
        stepHint: getStepHint(puzzle, currentStep),
      };
    }

    return {
      status: 'solved',
      userMove: userMovePayload,
      nextStep: currentStep + 1,
      isCheckmate: chess.isCheckmate(),
    };
  }

  // NOT the final step! The puzzle requires more moves.
  // Prepare the opponent's predefined forced defensive response at ply (currentStep + 1)
  const opponentPlyIndex = currentStep + 1;
  const opponentExpectedSan = puzzle.solutionMoves[opponentPlyIndex];

  const oppChess = new Chess(chess.fen());
  const oppMoveObj = oppChess.move(opponentExpectedSan);

  if (!oppMoveObj) {
    throw new Error(
      `Invalid opponent response "${opponentExpectedSan}" at ply ${opponentPlyIndex} in puzzle ${puzzle.id}`
    );
  }

  const defaultOppExplanation = oppChess.inCheck()
    ? `Opponent plays ${oppMoveObj.san} to counterattack with check.`
    : chess.inCheck()
    ? `Forced response: Opponent must play ${oppMoveObj.san} to get out of check.`
    : `Opponent responds with ${oppMoveObj.san} to defend against the primary threat.`;

  const explanation =
    puzzle.opponentExplanations?.[opponentPlyIndex] || defaultOppExplanation;

  return {
    status: 'opponent_turn',
    userMove: userMovePayload,
    opponentReply: {
      plyIndex: opponentPlyIndex,
      san: oppMoveObj.san,
      uci: `${oppMoveObj.from}${oppMoveObj.to}${oppMoveObj.promotion || ''}`,
      from: oppMoveObj.from as Square,
      to: oppMoveObj.to as Square,
      fenAfterOpponent: oppChess.fen(),
      explanation,
      isCheck: oppChess.inCheck(),
    },
    nextStep: currentStep + 2,
    isCheckmate: false,
  };
}
