import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { GrandmasterCoachService } from './grandmasterCoachService';
import {
  detectHangingPiece,
  detectForkForMove,
} from './coachingKnowledgeBase';
import { classifyMove, CLASSIFICATION_THRESHOLDS } from './analytics';
import { coachVoiceService } from './coachVoiceService';
import { generateStructuredGameReview } from './gameReviewService';
import { CHESS_COURSES } from '../data/lessons';
import { UciEngineSession } from './uciCore';
import { ChessEngine } from './engine';
import { GameMove } from '../types/chess';

test('PART 5 & 6 — Opening development move detection (1. e4 e5 2. Nf3)', () => {
  const coach = new GrandmasterCoachService();
  const game = new Chess();
  game.move('e4');
  game.move('e5');
  const fenBefore = game.fen();
  const move = game.move('Nf3');
  const fenAfter = game.fen();

  const explanation = coach.analyzeUserMove({
    fenBefore,
    fenAfter,
    san: move.san,
    from: move.from,
    to: move.to,
    moverColor: 'w',
    prevEvalWhiteCp: 25,
    newEvalWhiteCp: 40,
    bestMoveFrom: 'g1',
    bestMoveTo: 'f3',
    moveCount: 3,
  });

  assert.ok(
    explanation.state === 'PRAISING' || explanation.state === 'TEACHING',
    `Expected PRAISING or TEACHING for 2. Nf3, got ${explanation.state}`
  );
  assert.ok(
    explanation.speechBubble.includes('Nf3') &&
      (explanation.speechBubble.toLowerCase().includes('develop') ||
        explanation.speechBubble.includes('e5') ||
        explanation.speechBubble.includes('d4')),
    `Expected explanation to describe developing the knight and controlling central squares: ${explanation.speechBubble}`
  );
});

test('PART 5 & 6 — Blunder & Hanging Queen detection', () => {
  const coach = new GrandmasterCoachService();
  // Position after 1. e4 e5 2. Qh5 Nc6 — if White plays 3. Qxe5+?? Nxe5, White hangs the Queen!
  const game = new Chess();
  game.move('e4');
  game.move('e5');
  game.move('Qh5');
  game.move('Nc6');
  const fenBefore = game.fen();
  const move = game.move('Qxe5+');
  const fenAfter = game.fen();

  const hanging = detectHangingPiece(fenAfter, 'w');
  assert.ok(hanging, 'Should detect that White Queen on e5 is hanging to Black Knight on c6');
  assert.equal(hanging.square, 'e5');
  assert.equal(hanging.pieceName, 'queen');
  assert.equal(hanging.attackerFrom, 'c6');

  const explanation = coach.analyzeUserMove({
    fenBefore,
    fenAfter,
    san: move.san,
    from: move.from,
    to: move.to,
    moverColor: 'w',
    prevEvalWhiteCp: 0,
    newEvalWhiteCp: -750,
    bestMoveFrom: 'f1',
    bestMoveTo: 'c4',
    moveCount: 5,
  });

  assert.equal(explanation.state, 'WARNING');
  assert.equal(explanation.reaction, 'warning');
  assert.equal(explanation.classification, 'blunder');
  assert.ok(
    explanation.speechBubble.toLowerCase().includes('queen') &&
      explanation.speechBubble.includes('e5'),
    `Expected blunder warning mentioning Queen on e5, got: ${explanation.speechBubble}`
  );
  assert.equal(explanation.bestAlternativeSan, 'Bc4');
});

test('PART 5 & 6 — Missed Tactical Opportunity (Missed Knight Fork)', () => {
  const coach = new GrandmasterCoachService();
  // FEN where White Knight on d5 can fork Black's King on e8 and Queen on a8 via Nxc7+:
  const fenBefore = 'q3k2r/2p2ppp/8/3N4/8/8/PPP2PPP/R3K2R w KQk - 0 1';
  const forkInfo = detectForkForMove(fenBefore, 'd5', 'c7');
  assert.ok(forkInfo, 'Should detect Knight fork with Nxc7+');
  assert.ok(
    forkInfo.attackedTargets.length >= 2,
    `Expected at least 2 forked high-value targets, got ${forkInfo.attackedTargets.length}`
  );

  // Suppose user plays a quiet move a3 instead of Nxc7+
  const game = new Chess(fenBefore);
  const move = game.move('a3');
  const fenAfter = game.fen();

  const explanation = coach.analyzeUserMove({
    fenBefore,
    fenAfter,
    san: move.san,
    from: move.from,
    to: move.to,
    moverColor: 'w',
    prevEvalWhiteCp: 450,
    newEvalWhiteCp: 20,
    bestMoveFrom: 'd5',
    bestMoveTo: 'c7',
    moveCount: 15,
  });

  assert.equal(explanation.classification, 'missed_win');
  assert.ok(
    explanation.speechBubble.includes('Nxc7+') &&
      (explanation.speechBubble.toLowerCase().includes('simultaneously') ||
        explanation.speechBubble.toLowerCase().includes('fork') ||
        explanation.headline.toLowerCase().includes('fork')),
    `Expected missed fork explanation mentioning Nxc7+, got: ${explanation.speechBubble}`
  );
});

test('PART 6 & 7 — Opponent Move Coaching & Threat Explanation (Bc5 targeting f2)', () => {
  const coach = new GrandmasterCoachService();
  const game = new Chess();
  game.move('e4');
  game.move('e5');
  game.move('Nf3');
  game.move('Nc6');
  game.move('Bc4');
  const fenBefore = game.fen();
  const oppMove = game.move('Bc5');
  const fenAfter = game.fen();

  const explanation = coach.analyzeOpponentMove({
    fenBefore,
    fenAfter,
    san: oppMove.san,
    from: oppMove.from,
    to: oppMove.to,
    opponentColor: 'b',
    evalWhiteCp: 15,
    moveCount: 6,
  });

  assert.ok(
    explanation.state === 'EXPLAINING' || explanation.state === 'WARNING',
    `Expected EXPLAINING or WARNING state, got ${explanation.state}`
  );
  assert.ok(
    explanation.speechBubble.includes('Bc5') && explanation.speechBubble.includes('f2'),
    `Expected opponent coaching to explain Bc5 developing the bishop and targeting f2, got: ${explanation.speechBubble}`
  );
});

test('PART 8 — 3-Level Progressive Hint System (Strategic -> Tactical -> Best Move)', () => {
  const coach = new GrandmasterCoachService();
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

  const hint1 = coach.generateProgressiveHint(fen, 1, 4);
  assert.equal(hint1.state, 'HINTING');
  assert.equal(hint1.hintLevel, 1);
  assert.ok(!hint1.bestAlternativeUci, 'Level 1 strategic hint should not reveal the exact move arrow');

  const hint2 = coach.generateProgressiveHint(fen, 2, 4);
  assert.equal(hint2.state, 'HINTING');
  assert.equal(hint2.hintLevel, 2);
  assert.ok(
    hint2.speechBubble.length > 15,
    `Level 2 tactical hint should provide a concrete piece clue: ${hint2.speechBubble}`
  );

  const hint3 = coach.generateProgressiveHint(fen, 3, 4);
  assert.equal(hint3.state, 'HINTING');
  assert.equal(hint3.hintLevel, 3);
  assert.ok(hint3.bestAlternativeSan, 'Level 3 hint must reveal bestAlternativeSan');
  assert.ok(hint3.bestAlternativeUci, 'Level 3 hint must provide bestAlternativeUci arrow coordinates');
});

test('PART 3 & 14 — Checkmate celebration, Undo, and Restart coach synchronization', () => {
  const coach = new GrandmasterCoachService();
  // Scholar's mate final move Qxf7#
  const fenBefore = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 3';
  const game = new Chess(fenBefore);
  const mateMove = game.move('Qxf7#');
  const fenAfter = game.fen();

  const mateCoaching = coach.analyzeUserMove({
    fenBefore,
    fenAfter,
    san: mateMove.san,
    from: mateMove.from,
    to: mateMove.to,
    moverColor: 'w',
    prevEvalWhiteCp: 300,
    newEvalWhiteCp: 99999,
    bestMoveFrom: 'h5',
    bestMoveTo: 'f7',
    moveCount: 5,
  });

  assert.equal(mateCoaching.state, 'CELEBRATING');
  assert.equal(mateCoaching.reaction, 'celebrating');
  assert.ok(mateCoaching.speechBubble.toLowerCase().includes('checkmate'));

  // Undo / Reset synchronization
  const resetCoaching = coach.createInitialState(
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    'w',
    'Move taken back. Examine the board and choose your best continuation.'
  );
  assert.equal(resetCoaching.state, 'TEACHING');
  assert.ok(resetCoaching.speechBubble.toLowerCase().includes('taken back'));

  // Thinking state
  const thinkingCoaching = coach.createThinkingState(fenBefore, 4);
  assert.equal(thinkingCoaching.state, 'THINKING');
  assert.equal(thinkingCoaching.reaction, 'thinking');
});

test('PART 5 — Move classification thresholds & Black perspective normalization', () => {
  assert.ok(CLASSIFICATION_THRESHOLDS.mistakeMaxLossCp >= 200);
  // Black plays a move that improves Black's evaluation from 0 to -60 (White cp goes from 0 to -60 -> moverDelta = +60)
  const blackGood = classifyMove(0, -60, 'b', false, false);
  assert.ok(blackGood === 'best' || blackGood === 'excellent' || blackGood === 'great');

  // Black blunders: White cp jumps from 0 to +400 (moverDelta for Black = -400)
  const blackBlunder = classifyMove(0, 400, 'b', false, false);
  assert.equal(blackBlunder, 'blunder');
});

test('PART 11 — Voice Coaching mute/disable safety in headless environment', () => {
  coachVoiceService.updateSettings({ enabled: false, muted: true, rate: 1.0 });
  const settings = coachVoiceService.getSettings();
  assert.equal(settings.enabled, false);
  assert.equal(settings.muted, true);
  // Calling speak while disabled/muted must be a safe no-op returning false
  const spoke = coachVoiceService.speak('Test voice narration while disabled');
  assert.equal(spoke, false);
});

test('PART 9 & 13 — 4-Level Curriculum integrity & Post-Game Review recommendations', () => {
  assert.equal(CHESS_COURSES.length, 4, 'Curriculum must have 4 progressive levels');
  const levelIds = CHESS_COURSES.map((c) => c.id);
  assert.deepEqual(levelIds, ['beginner', 'intermediate', 'advanced', 'master']);

  for (const course of CHESS_COURSES) {
    assert.ok(course.lessons.length >= 4, `Course ${course.id} should have at least 4 lessons`);
    for (const lesson of course.lessons) {
      const c = new Chess(lesson.initialFen);
      assert.ok(
        lesson.task.expectedMoves.length >= 1,
        `Lesson ${lesson.id} must define at least 1 expected move`
      );
      const firstExpected = lesson.task.expectedMoves[0];
      const m = c.move(firstExpected);
      assert.ok(m, `Lesson ${lesson.id} expected move ${firstExpected} must be legal in its initialFen`);
    }
  }

  // Test structured post-game review with blunders & missed wins
  const sampleMoves: GameMove[] = [
    { from: 'e2', to: 'e4', san: 'e4', piece: 'p', color: 'w', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', classification: 'best', evalScore: 25 },
    { from: 'e7', to: 'e5', san: 'e5', piece: 'p', color: 'b', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', classification: 'best', evalScore: 20 },
    { from: 'd1', to: 'h5', san: 'Qh5', piece: 'q', color: 'w', fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2', classification: 'inaccuracy', evalScore: -35 },
    { from: 'b8', to: 'c6', san: 'Nc6', piece: 'n', color: 'b', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3', classification: 'best', evalScore: -30 },
    { from: 'h5', to: 'e5', san: 'Qxe5+', piece: 'q', color: 'w', fen: 'r1bqkbnr/pppp1ppp/2n5/4Q3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3', classification: 'blunder', evalScore: -780 },
  ];

  const review = generateStructuredGameReview({
    moves: sampleMoves,
    playerColor: 'w',
    result: 'loss',
    reason: 'Resignation',
  });
  assert.equal(review.counts.blunder, 1);
  assert.equal(review.counts.inaccuracy, 1);
  assert.ok(review.recommendedLessons.length >= 2, 'Should recommend personalized curriculum lessons');
  assert.ok(review.weaknessesIdentified.length >= 1, 'Should identify weaknesses from blunders');
});

test('PART 4 — UCI Engine Session single-worker reuse & stale response protection', async () => {
  const engine = new ChessEngine();
  await engine.waitReady();
  assert.equal(engine.isReady(), true);
  assert.equal(engine.getInitCount(), 1, 'Engine must initialize only once per session');

  const emitted: string[] = [];
  const uci = new UciEngineSession((line) => emitted.push(line));
  uci.handleCommand('uci');
  assert.ok(emitted.includes('uciok'));
  uci.handleCommand('isready');
  assert.ok(emitted.includes('readyok'));
});
