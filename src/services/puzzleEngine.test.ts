import test from 'node:test';
import assert from 'node:assert/strict';
import { CHESS_PUZZLES } from '../data/puzzles';
import {
  validatePuzzleDefinition,
  evaluateUserPuzzleMove,
  isMatePuzzle,
} from './puzzleEngine';
import { ChessPuzzle } from '../types/chess';

test('Every puzzle in CHESS_PUZZLES has a valid FEN, legal move sequence, opponent explanations, and verified checkmate for mate puzzles', () => {
  assert.ok(CHESS_PUZZLES.length >= 14, 'Expected at least 14 puzzles in dataset');

  for (const puzzle of CHESS_PUZZLES) {
    const validation = validatePuzzleDefinition(puzzle);
    assert.equal(
      validation.valid,
      true,
      `Puzzle ${puzzle.id} (${puzzle.title}) failed validation:\n${validation.errors.join('\n')}`
    );

    if (isMatePuzzle(puzzle)) {
      assert.equal(
        validation.isFinalCheckmate,
        true,
        `Mate puzzle ${puzzle.id} must end in genuine chess.js isCheckmate()`
      );
    }
  }
});

test('All required puzzle categories are represented in CHESS_PUZZLES', () => {
  const requiredCategories = [
    'mate1',
    'mate2',
    'mate3',
    'mate4',
    'fork',
    'pin',
    'skewer',
    'discovered',
    'double_attack',
    'defensive',
    'daily',
  ] as const;

  for (const cat of requiredCategories) {
    const count = CHESS_PUZZLES.filter((p) => p.category === cat).length;
    assert.ok(count >= 1, `Missing puzzle for required category: ${cat}`);
  }
});

test('Mate in 1: Marks solved only when move delivers actual checkmate, rejects wrong moves', () => {
  const mate1Puzzle = CHESS_PUZZLES.find((p) => p.id === 'puz-m1-1')!;
  assert.ok(mate1Puzzle);
  assert.equal(mate1Puzzle.requiredMovesCount, 1);

  // Wrong move first: Rb7 instead of Rb8#
  const wrongEval = evaluateUserPuzzleMove(mate1Puzzle, mate1Puzzle.fen, 0, 'Rb7');
  assert.equal(wrongEval.status, 'wrong');
  assert.equal(wrongEval.isCheckmate, false);
  assert.equal(wrongEval.nextStep, 0, 'Wrong move must not advance puzzle progress');
  assert.ok(wrongEval.wrongReason && wrongEval.wrongReason.length > 10);
  assert.ok(wrongEval.stepHint && wrongEval.stepHint.length > 10);

  // Correct mating move: Rb8#
  const rightEval = evaluateUserPuzzleMove(mate1Puzzle, mate1Puzzle.fen, 0, 'Rb8#');
  assert.equal(rightEval.status, 'solved');
  assert.equal(rightEval.isCheckmate, true);
  assert.equal(rightEval.nextStep, 1);
});

test('Mate in 2: NEVER marks solved after Move 1; requires opponent response and final mating Move 2', () => {
  const mate2Puzzles = CHESS_PUZZLES.filter((p) => p.category === 'mate2');
  assert.ok(mate2Puzzles.length >= 3);

  for (const puzzle of mate2Puzzles) {
    assert.equal(puzzle.requiredMovesCount, 2);
    assert.equal(puzzle.solutionMoves.length, 3);

    // Step 0: User plays Move 1
    const move1Eval = evaluateUserPuzzleMove(
      puzzle,
      puzzle.fen,
      0,
      puzzle.solutionMoves[0]
    );

    assert.notEqual(
      move1Eval.status,
      'solved',
      `Puzzle ${puzzle.id} must NOT be marked solved after first move!`
    );
    assert.equal(move1Eval.status, 'opponent_turn');
    assert.equal(move1Eval.isCheckmate, false);
    assert.equal(move1Eval.nextStep, 2);
    assert.ok(move1Eval.opponentReply, 'Expected automatic opponent reply payload');
    assert.ok(
      move1Eval.opponentReply.explanation.length > 10,
      'Opponent reply must include tactical explanation'
    );

    // Test wrong move on Move 2 before playing the right Move 2
    const fenAfterOpponent = move1Eval.opponentReply.fenAfterOpponent;
    const wrongMove2 = evaluateUserPuzzleMove(puzzle, fenAfterOpponent, 2, 'f3');
    assert.equal(wrongMove2.status, 'wrong');
    assert.equal(wrongMove2.nextStep, 2, 'Wrong second move must keep step at 2');

    // Step 2: User plays final mating Move 2
    const move2Eval = evaluateUserPuzzleMove(
      puzzle,
      fenAfterOpponent,
      2,
      puzzle.solutionMoves[2]
    );
    assert.equal(move2Eval.status, 'solved');
    assert.equal(move2Eval.isCheckmate, true);
    assert.equal(move2Eval.nextStep, 3);
  }
});

test('Mate in 3: Requires all 3 user moves and 2 forced opponent responses before solving', () => {
  const mate3Puzzles = CHESS_PUZZLES.filter((p) => p.category === 'mate3');
  assert.ok(mate3Puzzles.length >= 2);

  for (const puzzle of mate3Puzzles) {
    assert.equal(puzzle.requiredMovesCount, 3);
    assert.equal(puzzle.solutionMoves.length, 5);

    // Move 1 (ply 0)
    const step0 = evaluateUserPuzzleMove(puzzle, puzzle.fen, 0, puzzle.solutionMoves[0]);
    assert.equal(step0.status, 'opponent_turn', `${puzzle.id} Move 1 must not mark solved`);
    assert.equal(step0.isCheckmate, false);
    assert.equal(step0.nextStep, 2);
    assert.ok(step0.opponentReply);

    // Move 2 (ply 2)
    const step2 = evaluateUserPuzzleMove(
      puzzle,
      step0.opponentReply.fenAfterOpponent,
      2,
      puzzle.solutionMoves[2]
    );
    assert.equal(step2.status, 'opponent_turn', `${puzzle.id} Move 2 must not mark solved`);
    assert.equal(step2.isCheckmate, false);
    assert.equal(step2.nextStep, 4);
    assert.ok(step2.opponentReply);

    // Move 3 (ply 4 - final checkmate)
    const step4 = evaluateUserPuzzleMove(
      puzzle,
      step2.opponentReply.fenAfterOpponent,
      4,
      puzzle.solutionMoves[4]
    );
    assert.equal(step4.status, 'solved', `${puzzle.id} Move 3 must mark solved`);
    assert.equal(step4.isCheckmate, true);
    assert.equal(step4.nextStep, 5);
  }
});

test('Mate in 4+: Requires all 4 user moves and 3 forced opponent responses before solving', () => {
  const mate4Puzzle = CHESS_PUZZLES.find((p) => p.category === 'mate4')!;
  assert.ok(mate4Puzzle);
  assert.equal(mate4Puzzle.requiredMovesCount, 4);
  assert.equal(mate4Puzzle.solutionMoves.length, 7);

  let currentFen = mate4Puzzle.fen;
  let step = 0;

  // First 3 user moves must return opponent_turn
  for (let userMoveNum = 1; userMoveNum <= 3; userMoveNum++) {
    const res = evaluateUserPuzzleMove(
      mate4Puzzle,
      currentFen,
      step,
      mate4Puzzle.solutionMoves[step]
    );
    assert.equal(
      res.status,
      'opponent_turn',
      `Mate in 4 must not solve on move ${userMoveNum}`
    );
    assert.equal(res.isCheckmate, false);
    assert.ok(res.opponentReply);
    currentFen = res.opponentReply.fenAfterOpponent;
    step = res.nextStep;
  }

  // 4th and final user move delivers checkmate
  const finalRes = evaluateUserPuzzleMove(
    mate4Puzzle,
    currentFen,
    step,
    mate4Puzzle.solutionMoves[step]
  );
  assert.equal(finalRes.status, 'solved');
  assert.equal(finalRes.isCheckmate, true);
});

test('Fake checkmate guard: Rejects a mate puzzle if the final move in solutionMoves is not actually checkmate', () => {
  const brokenMatePuzzle: ChessPuzzle = {
    id: 'broken-m1',
    category: 'mate1',
    title: 'Broken Mate Test',
    theme: 'Test',
    difficulty: 'Beginner',
    rating: 600,
    // Black has h6 pawn moved so King can escape to h7!
    fen: '6k1/5pp1/7p/8/8/8/8/1R4K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 1,
    mateDepth: 1,
    solutionMoves: ['Rb8+'],
    hint: 'Test',
    explanation: 'Test',
  };

  const validation = validatePuzzleDefinition(brokenMatePuzzle);
  assert.equal(validation.valid, false, 'Validator must reject non-mating mate puzzle');

  const evalRes = evaluateUserPuzzleMove(brokenMatePuzzle, brokenMatePuzzle.fen, 0, 'Rb8+');
  assert.equal(
    evalRes.status,
    'wrong',
    'Evaluator must refuse to mark a mate puzzle solved if chess.isCheckmate() is false'
  );
});
