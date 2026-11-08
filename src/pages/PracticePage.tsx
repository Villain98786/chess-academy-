import React, { useState, useEffect } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { AppSettings, CoachExplanation, GameMove } from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { EvalBar } from '../components/Chessboard/EvalBar';
import { CapturedPieces } from '../components/Chessboard/CapturedPieces';
import { MoveHistory } from '../components/Chessboard/MoveHistory';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { chessEngine } from '../services/engine';
import { generateInstantMoveAnalysis, InstantMoveFeedback } from '../services/analytics';
import { grandmasterCoach } from '../services/grandmasterCoachService';
import {
  RotateCcw,
  ArrowUpDown,
  Lightbulb,
  Copy,
  Check,
  Bookmark,
} from 'lucide-react';

interface PracticePageProps {
  settings: AppSettings;
}

const FAMOUS_POSITIONS = [
  {
    name: 'Starting Position',
    desc: 'Standard initial chess army setup',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    name: 'The Opera Game (Morphy 1858)',
    desc: 'Paul Morphy with unstoppable development',
    fen: 'rn2kb1r/p3qppp/5n2/1B2p3/4P3/1Q6/PPP2PPP/RNB1K2R b KQkq - 0 9',
  },
  {
    name: "Kasparov's Immortal (1999)",
    desc: 'Garry Kasparov vs Veselin Topalov epic sacrifice',
    fen: 'b2r3r/4k1pp/p1q1pp2/8/2N5/1P2QP2/P5PP/2R2RK1 w - - 0 25',
  },
  {
    name: 'Lucena Position (Endgame)',
    desc: 'The fundamental technique to win rook endgames',
    fen: '1K1R4/3P1k2/8/8/8/8/8/r7 w - - 0 1',
  },
  {
    name: 'Philidor Defense Trap',
    desc: 'Classic Légal mating trap on e5 and f7',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
  },
];

export const PracticePage: React.FC<PracticePageProps> = ({ settings }) => {
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [orientation, setOrientation] = useState<Color>('w');
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [evalScore, setEvalScore] = useState(0);
  const [liveFeedback, setLiveFeedback] = useState<InstantMoveFeedback | null>(null);
  const [coachExp, setCoachExp] = useState<CoachExplanation>(() =>
    grandmasterCoach.createInitialState(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'w',
      'Interactive Practice Board: Play moves for either side or load famous master positions to explore lines with GM Elena.'
    )
  );
  const [fenInput, setFenInput] = useState('');
  const [fenError, setFenError] = useState<string | null>(null);
  const [copiedFen, setCopiedFen] = useState(false);
  const [isEngineCalculating, setIsEngineCalculating] = useState(false);

  // Update evaluation
  useEffect(() => {
    const score = chessEngine.evaluatePosition(chess);
    setEvalScore(score);
    setHintMove(null);
  }, [chess]);

  // Execute a legal move with instant board response and async analysis
  const handleMove = (m: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    try {
      const fenBefore = chess.fen();
      const prevScore = chessEngine.evaluatePosition(chess);

      const piece = chess.get(m.from);
      const targetPiece = chess.get(m.to);
      const res = chess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion || 'q',
      });

      if (!res) return;

      // 1. Update board and move history IMMEDIATELY
      const newChess = new Chess(chess.fen());
      const fenAfter = newChess.fen();
      setChess(newChess);
      setLastMove({ from: m.from, to: m.to });

      const newScore = chessEngine.evaluatePosition(newChess);
      const quickFeedback = generateInstantMoveAnalysis({
        fenBefore,
        fenAfter,
        san: res.san,
        from: m.from,
        to: m.to,
        moverColor: piece?.color || 'w',
        prevEvalWhiteCp: prevScore,
        newEvalWhiteCp: newScore,
      });

      setLiveFeedback(quickFeedback);

      const newGameMove: GameMove = {
        from: m.from,
        to: m.to,
        san: res.san,
        piece: piece?.type || 'p',
        color: piece?.color || 'w',
        captured: targetPiece?.type,
        fen: fenAfter,
        evalScore: newScore,
        classification: quickFeedback.classification,
      };

      const updatedMoves = [...moves, newGameMove];
      setMoves(updatedMoves);
      setCurrentMoveIndex(updatedMoves.length - 1);

      // 2. Refine best-alternative comparison and update GrandmasterCoach
      const candidates = chessEngine.computeQuickCandidates(fenBefore, 1);
      const bestCand = candidates[0];
      if (bestCand) {
        const enriched = generateInstantMoveAnalysis({
          fenBefore,
          fenAfter,
          san: res.san,
          from: m.from,
          to: m.to,
          moverColor: piece?.color || 'w',
          prevEvalWhiteCp: prevScore,
          newEvalWhiteCp: newScore,
          bestMoveFrom: bestCand.from,
          bestMoveTo: bestCand.to,
        });
        setLiveFeedback(enriched);
      }

      const coachAnalysis = grandmasterCoach.analyzeUserMove({
        fenBefore,
        fenAfter,
        san: res.san,
        from: m.from,
        to: m.to,
        moverColor: piece?.color || 'w',
        prevEvalWhiteCp: prevScore,
        newEvalWhiteCp: newScore,
        bestMoveFrom: bestCand?.from,
        bestMoveTo: bestCand?.to,
        moveCount: updatedMoves.length,
        pv: bestCand?.pv,
      });
      setCoachExp(coachAnalysis);
    } catch {
      // Illegal move
    }
  };

  // Undo move
  const handleUndo = () => {
    if (moves.length === 0) return;
    chess.undo();
    const newChess = new Chess(chess.fen());
    setChess(newChess);
    const updatedMoves = moves.slice(0, -1);
    setMoves(updatedMoves);
    setCurrentMoveIndex(updatedMoves.length - 1);
    setLiveFeedback(null);
    setLastMove(
      updatedMoves.length > 0
        ? {
            from: updatedMoves[updatedMoves.length - 1].from,
            to: updatedMoves[updatedMoves.length - 1].to,
          }
        : null
    );
  };

  // Reset board
  const handleReset = () => {
    const fresh = new Chess();
    setChess(fresh);
    setMoves([]);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setHintMove(null);
    setLiveFeedback(null);
  };

  // Load preset position
  const handleLoadPreset = (fen: string) => {
    try {
      const fresh = new Chess();
      fresh.load(fen);
      setChess(fresh);
      setMoves([]);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      setHintMove(null);
      setLiveFeedback(null);
      setFenError(null);
    } catch {
      // Invalid
    }
  };

  // Load custom FEN
  const handleLoadCustomFen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fenInput.trim()) return;
    try {
      const fresh = new Chess();
      fresh.load(fenInput.trim());
      setChess(fresh);
      setMoves([]);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      setHintMove(null);
      setLiveFeedback(null);
      setFenInput('');
      setFenError(null);
    } catch {
      setFenError('Invalid FEN string. Please check the piece placement and turn fields.');
    }
  };

  // Copy current FEN
  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  // Request engine hint
  const handleRequestHint = async () => {
    setIsEngineCalculating(true);
    try {
      const best = await chessEngine.getBestMove(chess, 'master');
      if (best) {
        setHintMove({ from: best.from, to: best.to });
      }
    } finally {
      setIsEngineCalculating(false);
    }
  };

  // Select historical move in history
  const handleSelectMove = (index: number) => {
    if (index === -1) {
      const fresh = new Chess();
      setChess(fresh);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      return;
    }
    const targetMove = moves[index];
    if (targetMove) {
      const fresh = new Chess();
      fresh.load(targetMove.fen);
      setChess(fresh);
      setCurrentMoveIndex(index);
      setLastMove({ from: targetMove.from, to: targetMove.to });
    }
  };

  // Captured pieces calculation
  const capturedPieces = React.useMemo(() => {
    const whiteCaptured: PieceSymbol[] = [];
    const blackCaptured: PieceSymbol[] = [];
    moves.slice(0, currentMoveIndex + 1).forEach((m) => {
      if (m.captured) {
        if (m.color === 'w') {
          whiteCaptured.push(m.captured);
        } else {
          blackCaptured.push(m.captured);
        }
      }
    });
    return { white: whiteCaptured, black: blackCaptured };
  }, [moves, currentMoveIndex]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Flip Board</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={moves.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Takeback</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 transition-colors"
          >
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRequestHint}
            disabled={isEngineCalculating || chess.isGameOver()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 disabled:opacity-40 transition-all hover:scale-105"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{isEngineCalculating ? 'Calculating...' : 'Engine Hint Arrow'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyFen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition-colors"
            title="Copy FEN Position"
          >
            {copiedFen ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedFen ? 'Copied' : 'FEN'}</span>
          </button>
        </div>
      </div>

      {/* Main Board & Panels Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Interactive Board */}
        <div className="lg:col-span-7 flex flex-col items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          {/* Opponent / Top Player Tray */}
          <div className="w-full max-w-[560px] flex items-center justify-between text-xs text-neutral-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-200">
                {orientation === 'w' ? 'Black (Practice)' : 'White (Practice)'}
              </span>
              <CapturedPieces
                captured={orientation === 'w' ? capturedPieces.black : capturedPieces.white}
                playerColor={orientation === 'w' ? 'b' : 'w'}
              />
            </div>
            <div className="font-mono text-[11px] px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800">
              Turn: {chess.turn() === 'w' ? 'White' : 'Black'}
            </div>
          </div>

          {/* Board + Live Evaluation Bar */}
          <div className="flex gap-2.5 sm:gap-3 items-stretch justify-center w-full">
            {settings.showEvalBar && (
              <EvalBar
                score={evalScore}
                orientation={orientation}
                className="h-auto min-h-[320px] max-h-[560px]"
              />
            )}
            <div className="flex-1 max-w-[560px] aspect-square flex items-center justify-center">
              <Chessboard
                chess={chess}
                orientation={orientation}
                theme={settings.boardTheme}
                showCoordinates={settings.showCoordinates}
                showLegalMoves={settings.showLegalMoves}
                autoQueen={settings.autoQueen}
                interactive={true}
                lastMove={lastMove}
                hintMove={hintMove}
                lastMoveClassification={liveFeedback?.classification}
                onMove={handleMove}
              />
            </div>
          </div>

          {/* User / Bottom Player Tray */}
          <div className="w-full max-w-[560px] flex items-center justify-between text-xs text-neutral-400 px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-neutral-200">
                {orientation === 'w' ? 'White (Practice)' : 'Black (Practice)'}
              </span>
              <CapturedPieces
                captured={orientation === 'w' ? capturedPieces.white : capturedPieces.black}
                playerColor={orientation === 'w' ? 'w' : 'b'}
              />
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              Eval: {chessEngine.formatScore(evalScore)}
            </div>
          </div>
        </div>

        {/* Right Sidebar: AI Tutor, Move History, Presets */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-Time Grandmaster Chess Coach */}
          <GrandmasterCoach
            fen={chess.fen()}
            explanation={coachExp}
            onHighlightSquares={(arrow) => setHintMove(arrow)}
          />

          {/* Move History Table */}
          <MoveHistory
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={handleSelectMove}
          />

          {/* Famous Preset Positions */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-md space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Preset Position</span>
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 text-xs">
              {FAMOUS_POSITIONS.map((pos, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleLoadPreset(pos.fen)}
                  className="w-full text-left p-2 rounded-lg bg-neutral-950 border border-neutral-850 hover:border-emerald-600/50 hover:bg-neutral-850 transition-colors"
                >
                  <div className="font-semibold text-white">{pos.name}</div>
                  <div className="text-[10px] text-neutral-400">{pos.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom FEN loader */}
            <form onSubmit={handleLoadCustomFen} className="space-y-1.5 pt-2 border-t border-neutral-800">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={fenInput}
                  onChange={(e) => setFenInput(e.target.value)}
                  placeholder="Paste custom FEN notation..."
                  className="flex-1 bg-neutral-950 border border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!fenInput.trim()}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
                >
                  Load
                </button>
              </div>
              {fenError && <p className="text-[11px] text-rose-400">{fenError}</p>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
