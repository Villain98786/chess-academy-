import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMove,
  calculateColorAccuracy,
  generateInstantMoveAnalysis,
} from './analytics';
import { GameMove } from '../types/chess';

test('classifyMove identifies brilliant, best, inaccuracy, mistake, and blunder accurately', () => {
  // Checkmate is always brilliant
  assert.equal(classifyMove(200, 100000, 'w', true, true), 'brilliant');

  // Engine best move with neutral/positive delta is best
  assert.equal(classifyMove(0, 15, 'w', true, false), 'best');

  // Slight drop (-50 cp for White) is inaccuracy
  assert.equal(classifyMove(50, -15, 'w', false, false), 'inaccuracy');

  // Moderate drop (-150 cp for White) is mistake
  assert.equal(classifyMove(50, -100, 'w', false, false), 'mistake');

  // Severe drop (-350 cp for Black: White eval goes from 0 to +350) is blunder
  assert.equal(classifyMove(0, 350, 'b', false, false), 'blunder');
});

test('calculateColorAccuracy returns realistic percentage from move classifications', () => {
  const sampleMoves: GameMove[] = [
    { from: 'e2', to: 'e4', san: 'e4', piece: 'p', color: 'w', fen: '', classification: 'best' },
    { from: 'e7', to: 'e5', san: 'e5', piece: 'p', color: 'b', fen: '', classification: 'best' },
    { from: 'g1', to: 'f3', san: 'Nf3', piece: 'n', color: 'w', fen: '', classification: 'good' },
    { from: 'b8', to: 'c6', san: 'Nc6', piece: 'n', color: 'b', fen: '', classification: 'blunder' },
  ];

  const whiteAcc = calculateColorAccuracy(sampleMoves, 'w');
  const blackAcc = calculateColorAccuracy(sampleMoves, 'b');

  assert.equal(whiteAcc, 96); // (100 + 92) / 2 = 96
  assert.equal(blackAcc, 58); // (100 + 15) / 2 = 57.5 -> 58
});

test('generateInstantMoveAnalysis produces instant tactical feedback with best move comparison', () => {
  const feedback = generateInstantMoveAnalysis({
    fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    san: 'e4',
    from: 'e2',
    to: 'e4',
    moverColor: 'w',
    prevEvalWhiteCp: 0,
    newEvalWhiteCp: 25,
    bestMoveFrom: 'e2',
    bestMoveTo: 'e4',
  });

  assert.equal(feedback.classification, 'best');
  assert.equal(feedback.bestMoveSan, 'e4');
  assert.ok(feedback.tacticalNote.includes('e4'));
});
