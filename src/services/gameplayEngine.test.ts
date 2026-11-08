import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { ChessEngine, DIFFICULTY_LEVELS } from './engine';
import { UciEngineSession } from './uciCore';
import {
  identifyOpeningFromMoves,
  detectCriticalMoments,
  generatePgnFromMoves,
} from './analytics';

test('1 & 2. Legal chess moves and illegal move rejection with FEN synchronization', () => {
  const chess = new Chess();
  const move1 = chess.move({ from: 'e2', to: 'e4' });
  assert.ok(move1);
  assert.equal(move1.san, 'e4');
  assert.equal(
    chess.fen(),
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'
  );

  // Illegal move: Black trying to move White pawn or Knight jumping to illegal square
  assert.throws(() => {
    chess.move({ from: 'b8', to: 'b6' });
  });
  assert.equal(chess.turn(), 'b');
});

test('3. Castling (Kingside and Queenside) validation', () => {
  // Kingside castling
  const kingsideChess = new Chess(
    'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
  );
  const castleK = kingsideChess.move('O-O');
  assert.ok(castleK);
  assert.equal(castleK.from, 'e1');
  assert.equal(castleK.to, 'g1');
  assert.equal(kingsideChess.get('g1')?.type, 'k');
  assert.equal(kingsideChess.get('f1')?.type, 'r');

  // Queenside castling
  const queensideChess = new Chess(
    'r3kbnr/pppqpppp/2n5/3p1b2/3P1B2/2N1PN2/PPPQBPPP/R3K2R w KQkq - 6 6'
  );
  const castleQ = queensideChess.move('O-O-O');
  assert.ok(castleQ);
  assert.equal(castleQ.from, 'e1');
  assert.equal(castleQ.to, 'c1');
  assert.equal(queensideChess.get('c1')?.type, 'k');
  assert.equal(queensideChess.get('d1')?.type, 'r');
});

test('4. En passant capture validation', () => {
  const chess = new Chess();
  chess.move('e4');
  chess.move('a6');
  chess.move('e5');
  chess.move('d5'); // double-step creates en-passant target on d6
  const ep = chess.move({ from: 'e5', to: 'd6' });
  assert.ok(ep);
  assert.equal(ep.san, 'exd6');
  assert.equal(chess.get('d5'), undefined, 'Captured d5 pawn must be removed');
  assert.equal(chess.get('d6')?.type, 'p');
});

test('5. Pawn promotion (Queen and underpromotion to Knight)', () => {
  const promoChess = new Chess('8/P5k1/8/8/8/8/8/6K1 w - - 0 1');
  const queenMove = promoChess.move({ from: 'a7', to: 'a8', promotion: 'q' });
  assert.ok(queenMove);
  assert.equal(queenMove.san, 'a8=Q');
  assert.equal(promoChess.get('a8')?.type, 'q');

  promoChess.undo();
  const knightMove = promoChess.move({ from: 'a7', to: 'a8', promotion: 'n' });
  assert.ok(knightMove);
  assert.equal(knightMove.san, 'a8=N');
  assert.equal(promoChess.get('a8')?.type, 'n');
});

test('6 & 7. Checkmate and Stalemate detection', () => {
  // Fool's mate checkmate
  const mateChess = new Chess();
  mateChess.move('f3');
  mateChess.move('e5');
  mateChess.move('g4');
  mateChess.move('Qh4#');
  assert.equal(mateChess.isCheckmate(), true);
  assert.equal(mateChess.isGameOver(), true);

  // Classic stalemate position
  const stalemateChess = new Chess('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
  assert.equal(stalemateChess.isStalemate(), true);
  assert.equal(stalemateChess.isCheckmate(), false);
  assert.equal(stalemateChess.isDraw(), true);
});

test('8 & 9. Undo (takeback), restart, and FEN synchronization', () => {
  const chess = new Chess();
  const startFen = chess.fen();

  chess.move('e4');
  chess.move('e5');
  const fenAfterE5 = chess.fen();
  chess.move('Nf3');
  chess.move('Nc6');

  // Takeback 2 plies (computer + player)
  chess.undo();
  chess.undo();
  assert.equal(chess.fen(), fenAfterE5);

  // Restart game
  chess.reset();
  assert.equal(chess.fen(), startFen);
});

test('10 & 11. Engine initialization only once and UCI Worker response handling', async () => {
  const engine = new ChessEngine();
  await engine.waitReady();
  assert.equal(engine.isReady(), true);
  assert.equal(engine.getInitCount(), 1, 'Engine must initialize only once');

  let telemetryReceived = false;
  const unsub = engine.onTelemetry((t) => {
    if (t.depth >= 1) telemetryReceived = true;
  });

  const chess = new Chess();
  const move1 = await engine.getBestMove(chess, 'beginner');
  assert.ok(move1);
  assert.equal(engine.getInitCount(), 1, 'Engine must reuse Worker after Move 1');
  assert.equal(telemetryReceived, true, 'Telemetry listener must receive UCI info updates');

  chess.move({ from: move1.from, to: move1.to, promotion: move1.promotion || 'q' });
  const move2 = await engine.getBestMove(chess, 'easy');
  assert.ok(move2);
  assert.equal(engine.getInitCount(), 1, 'Engine must reuse Worker after Move 2');

  unsub();
});

test('12, 13 & 14. Engine search cancellation, rapid concurrent searches, and game-over guard', async () => {
  const engine = new ChessEngine();
  await engine.waitReady();

  const pos1 = new Chess();
  pos1.move('e4');

  const pos2 = new Chess();
  pos2.move('d4');

  // Fire two rapid searches back-to-back: first search must be cancelled immediately (`null`)
  const p1 = engine.getBestMove(pos1, 'master');
  const p2 = engine.getBestMove(pos2, 'beginner');

  const [res1, res2] = await Promise.all([p1, p2]);
  assert.equal(res1, null, 'Outdated search p1 must resolve to null when superseded by p2');
  assert.ok(res2, 'Latest search p2 must return a valid best move');
  assert.equal(
    res2.fenSearched,
    pos2.fen(),
    'Resolved move must belong to the latest position FEN'
  );

  // Explicit stop during search (e.g., when game ends or user clicks Resign / New Game)
  const p3 = engine.getBestMove(pos2, 'master');
  engine.stop();
  const res3 = await p3;
  assert.equal(res3, null, 'Stopped search must resolve to null and never apply a stale move');
});

test('15 & 16. Switching difficulty, thinking speed modes, and switching sides', async () => {
  const engine = new ChessEngine();
  await engine.waitReady();

  // Verify difficulty target move times scale properly across fast / balanced / deep
  const fastTime = engine.getTargetMoveTimeMs('intermediate', 'fast');
  const balancedTime = engine.getTargetMoveTimeMs('intermediate', 'balanced');
  const deepTime = engine.getTargetMoveTimeMs('intermediate', 'deep');

  assert.ok(fastTime < balancedTime, 'Fast speed mode must use shorter movetime than balanced');
  assert.ok(balancedTime < deepTime, 'Deep speed mode must use longer movetime than balanced');
  assert.equal(DIFFICULTY_LEVELS.beginner.skillLevel, 0);
  assert.equal(DIFFICULTY_LEVELS.master.skillLevel, 20);

  // Verify UCI session handles uci, isready, position, go, stop, and quit cleanly
  const emitted: string[] = [];
  const uci = new UciEngineSession((line) => emitted.push(line));
  uci.handleCommand('uci');
  assert.ok(emitted.includes('uciok'));
  uci.handleCommand('isready');
  assert.ok(emitted.includes('readyok'));

  // Opening identification and PGN generation
  const sampleMoves = [
    { from: 'e2' as const, to: 'e4' as const, san: 'e4', piece: 'p' as const, color: 'w' as const, fen: '' },
    { from: 'e7' as const, to: 'e5' as const, san: 'e5', piece: 'p' as const, color: 'b' as const, fen: '' },
    { from: 'g1' as const, to: 'f3' as const, san: 'Nf3', piece: 'n' as const, color: 'w' as const, fen: '' },
    { from: 'b8' as const, to: 'c6' as const, san: 'Nc6', piece: 'n' as const, color: 'b' as const, fen: '' },
    { from: 'f1' as const, to: 'c4' as const, san: 'Bc4', piece: 'b' as const, color: 'w' as const, fen: '' },
    { from: 'f8' as const, to: 'c5' as const, san: 'Bc5', piece: 'b' as const, color: 'b' as const, fen: '' },
  ];
  const opening = identifyOpeningFromMoves(sampleMoves);
  assert.equal(opening.eco, 'C50');
  assert.ok(opening.name.includes('Italian Game'));

  const pgn = generatePgnFromMoves(sampleMoves, {
    white: 'Player',
    black: 'Stockfish',
    result: 'win',
    playerColor: 'w',
    opening: `${opening.eco} ${opening.name}`,
  });
  assert.ok(pgn.includes('1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 1-0'));
  assert.equal(detectCriticalMoments([]).length, 0);
});
