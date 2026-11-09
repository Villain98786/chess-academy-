import React, { useState, useEffect, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { AppSettings, CoachExplanation, CoachState, GameMove } from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { EvalBar } from '../components/Chessboard/EvalBar';
import { CapturedPieces } from '../components/Chessboard/CapturedPieces';
import { MoveHistory } from '../components/Chessboard/MoveHistory';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { chessEngine } from '../services/engine';
import { generateInstantMoveAnalysis, InstantMoveFeedback } from '../services/analytics';
import { grandmasterCoach } from '../services/grandmasterCoachService';
import { NavPage } from '../components/Navigation/Sidebar';
import {
  RotateCcw,
  ArrowUpDown,
  Lightbulb,
  Copy,
  Check,
  Bookmark,
  Sparkles,
  ShieldAlert,
  Cpu,
  GraduationCap,
  Award,
} from 'lucide-react';

interface PracticePageProps {
  settings: AppSettings;
  onNavigate?: (page: NavPage, context?: unknown) => void;
}

const COACH_PERSONAS = [
  {
    id: 'elena',
    name: 'GM Elena Rostova',
    title: 'FIDE 2640 • AI Senior Tactical Instructor',
    style: 'Classical & Tactical Clarity',
    badge: '2640',
  },
  {
    id: 'garry',
    name: 'GM Garry AI',
    title: 'FIDE 2850 • Dynamic Attacking Specialist',
    style: 'Aggressive Initiative & Sacrifices',
    badge: '2850',
  },
  {
    id: 'judit',
    name: 'GM Judit AI',
    title: 'FIDE 2735 • Combinational Firepower',
    style: 'Sharp King Hunts & Open Files',
    badge: '2735',
  },
  {
    id: 'anatoly',
    name: 'GM Anatoly AI',
    title: 'FIDE 2780 • Positional & Prophylaxis Master',
    style: 'Boa Constrictor Positional Squeeze',
    badge: '2780',
  },
];

const FAMOUS_POSITIONS = [
  {
    name: 'Starting Position',
    tag: 'STANDARD',
    desc: 'Standard initial chess army setup',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    name: 'The Opera Game (Morphy 1858)',
    tag: 'RAPID DEVELOPMENT',
    desc: 'Paul Morphy with unstoppable development & sacrifices',
    fen: 'rn2kb1r/p3qppp/5n2/1B2p3/4P3/1Q6/PPP2PPP/RNB1K2R b KQkq - 0 9',
  },
  {
    name: "Kasparov's Immortal (1999)",
    tag: 'KING HUNT',
    desc: 'Garry Kasparov vs Veselin Topalov epic rook sacrifice',
    fen: 'b2r3r/4k1pp/p1q1pp2/8/2N5/1P2QP2/P5PP/2R2RK1 w - - 0 25',
  },
  {
    name: 'Lucena Position (Endgame)',
    tag: 'ENDGAME BRIDGE',
    desc: 'The fundamental bridge-building technique to win rook endgames',
    fen: '1K1R4/3P1k2/8/8/8/8/8/r7 w - - 0 1',
  },
  {
    name: 'Philidor Defense Légal Trap',
    tag: 'MATING NET',
    desc: 'Classic queen sacrifice mating trap on e5 and f7',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
  },
];

export const PracticePage: React.FC<PracticePageProps> = ({ settings, onNavigate }) => {
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [orientation, setOrientation] = useState<Color>('w');
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [evalScore, setEvalScore] = useState(0);
  const [liveFeedback, setLiveFeedback] = useState<InstantMoveFeedback | null>(null);
  const [selectedPersona, setSelectedPersona] = useState(COACH_PERSONAS[0]);
  const [activePresetName, setActivePresetName] = useState(FAMOUS_POSITIONS[0].name);

  const [coachExp, setCoachExp] = useState<CoachExplanation>(() =>
    grandmasterCoach.createInitialState(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'w',
      'Welcome to the AI Grandmaster Coach Studio! Play moves for either side, request progressive hints, or load famous master positions below.'
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
    setActivePresetName(FAMOUS_POSITIONS[0].name);
  };

  // Load preset position
  const handleLoadPreset = (pos: (typeof FAMOUS_POSITIONS)[number]) => {
    try {
      const fresh = new Chess();
      fresh.load(pos.fen);
      setChess(fresh);
      setMoves([]);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      setHintMove(null);
      setLiveFeedback(null);
      setFenError(null);
      setActivePresetName(pos.name);
      setCoachExp(
        grandmasterCoach.createInitialState(
          pos.fen,
          fresh.turn(),
          `Loaded "${pos.name}" (${pos.desc}). Click Position Plan or Hint to inspect the critical continuation!`
        )
      );
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
      setActivePresetName('Custom FEN Study');
    } catch {
      setFenError('Invalid FEN string. Please check piece placement and turn fields.');
    }
  };

  // Copy current FEN
  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  // Request engine hint arrow
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

  // Simulate Coach Avatar Reaction States (from Stitch AI Grandmaster Coach screen)
  const handleSimulateCoachState = (targetState: CoachState) => {
    const plan = grandmasterCoach.explainPositionPlan(chess.fen(), moves.length);
    const reactionMap: Record<CoachState, CoachExplanation['reaction']> = {
      THINKING: 'thinking',
      TEACHING: 'explaining',
      PRAISING: 'happy',
      WARNING: 'warning',
      EXPLAINING: 'explaining',
      HINTING: 'thinking',
      CELEBRATING: 'celebrating',
      ENCOURAGING: 'happy',
    };
    setCoachExp({
      ...plan,
      id: `sim-${targetState}-${Date.now()}`,
      state: targetState,
      reaction: reactionMap[targetState],
      shouldSpeak: false,
    });
  };

  // Captured pieces calculation
  const capturedPieces = useMemo(() => {
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

  // Dynamic Position Vulnerability & Piece Synergy Metrics
  const positionMetrics = useMemo(() => {
    const legalCount = chess.moves().length;
    const isCheck = chess.inCheck();
    const synergy = Math.min(98, Math.max(42, 65 + Math.round(legalCount * 0.7)));
    const kingSafety = isCheck ? 'Exposed (In Check!)' : legalCount > 28 ? 'Dynamic Tension' : 'Solid Shelter';
    return { synergy, kingSafety, legalCount };
  }, [chess]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Ribbon: Grandmaster Faculty Selector & Sandbox Action Controls (Stitch Screen 3) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#111624] border border-white/[0.08] p-4 rounded-2xl shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mr-1 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Grandmaster Faculty:</span>
          </span>
          {COACH_PERSONAS.map((persona) => {
            const isSelected = selectedPersona.id === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setSelectedPersona(persona)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow'
                    : 'bg-[#171c2b] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{persona.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0a0e18] text-amber-400">
                  {persona.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Board Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Flip Board</span>
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={moves.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Takeback</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
          >
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleRequestHint}
            disabled={isEngineCalculating || chess.isGameOver()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-[#070a12] text-xs font-extrabold shadow-lg shadow-emerald-950/50 disabled:opacity-40 transition-all"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{isEngineCalculating ? 'Calculating...' : 'Engine Hint Arrow'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyFen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-300 text-xs font-mono border border-white/10 transition-colors"
            title="Copy FEN Position"
          >
            {copiedFen ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedFen ? 'Copied' : 'FEN'}</span>
          </button>
        </div>
      </div>

      {/* Main 12-Column Interactive Coaching & Board Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interactive Masterclass Chessboard + Position Vulnerability Meters */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex flex-col items-center bg-[#111624] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5">
            {/* Top Board Context Header */}
            <div className="w-full max-w-[560px] flex items-center justify-between text-xs px-3.5 py-2.5 bg-[#171c2b] border border-white/[0.07] rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 shrink-0">
                  STUDY
                </span>
                <span className="font-bold text-slate-100 truncate">{activePresetName}</span>
                <CapturedPieces
                  captured={orientation === 'w' ? capturedPieces.black : capturedPieces.white}
                  playerColor={orientation === 'w' ? 'b' : 'w'}
                />
              </div>
              <div className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-[#0a0e18] border border-white/10 text-emerald-400 shrink-0">
                Turn: {chess.turn() === 'w' ? 'White' : 'Black'}
              </div>
            </div>

            {/* Board + Live Evaluation Bar */}
            <div className="flex gap-2.5 sm:gap-3.5 items-stretch justify-center w-full">
              {settings.showEvalBar && (
                <EvalBar
                  score={evalScore}
                  orientation={orientation}
                  className="h-auto min-h-[300px] max-h-[560px]"
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

            {/* Bottom Player / Evaluation Strip */}
            <div className="w-full max-w-[560px] flex items-center justify-between text-xs px-3.5 py-2.5 bg-[#171c2b] border border-white/[0.07] rounded-xl">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-200">
                  {orientation === 'w' ? 'White Perspective' : 'Black Perspective'}
                </span>
                <CapturedPieces
                  captured={orientation === 'w' ? capturedPieces.white : capturedPieces.black}
                  playerColor={orientation === 'w' ? 'w' : 'b'}
                />
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-slate-400">
                  Legal Moves: <strong className="text-slate-200">{positionMetrics.legalCount}</strong>
                </span>
                <span className="text-emerald-400 font-bold">
                  Eval: {chessEngine.formatScore(evalScore)}
                </span>
              </div>
            </div>
          </div>

          {/* Position Vulnerability & Tactical Synergy Telemetry Card (Stitch AI Coach) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#111624] border border-white/[0.08] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono uppercase text-[10px]">
                  King Safety & Structure
                </span>
                <ShieldAlert className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-slate-100">{positionMetrics.kingSafety}</p>
              <div className="w-full h-1.5 bg-[#0a0e18] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    chess.inCheck() ? 'bg-rose-500 w-4/5' : 'bg-emerald-400 w-2/3'
                  }`}
                />
              </div>
            </div>

            <div className="bg-[#111624] border border-white/[0.08] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono uppercase text-[10px]">
                  Piece Coordination Index
                </span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-sm font-bold text-cyan-400 font-mono">
                {positionMetrics.synergy}% Synergy
              </p>
              <div className="w-full h-1.5 bg-[#0a0e18] rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${positionMetrics.synergy}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Grandmaster Coach, Avatar State Simulator, Move History & Master Positions */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-Time Grandmaster Chess Coach */}
          <GrandmasterCoach
            fen={chess.fen()}
            explanation={coachExp}
            coachName={selectedPersona.name}
            coachTitle={selectedPersona.title}
            onHighlightSquares={(arrow) => setHintMove(arrow)}
            onOpenLesson={(courseId, lessonId) => {
              if (onNavigate) onNavigate('learn', { courseId, lessonId });
            }}
          />

          {/* Interactive Coach State Simulator Bar (Stitch AI Grandmaster Coach) */}
          <div className="bg-[#111624] border border-white/[0.08] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Coach Focus Mode:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { state: 'THINKING', label: 'Deep Calc' },
                  { state: 'PRAISING', label: 'Brilliance' },
                  { state: 'WARNING', label: 'Threat Alert' },
                  { state: 'TEACHING', label: 'Principle' },
                ] as Array<{ state: CoachState; label: string }>
              ).map((btn) => (
                <button
                  key={btn.state}
                  type="button"
                  onClick={() => handleSimulateCoachState(btn.state)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-colors ${
                    coachExp.state === btn.state
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-[#171c2b] text-slate-400 hover:text-white border-white/5'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Move History Table */}
          <MoveHistory
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={handleSelectMove}
          />

          {/* Famous Preset Master Positions & Custom FEN Loader */}
          <div className="bg-[#111624] border border-white/[0.08] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                <span>Curated Masterclass Drills</span>
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                {FAMOUS_POSITIONS.length} Presets
              </span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {FAMOUS_POSITIONS.map((pos, idx) => {
                const isCurrent = activePresetName === pos.name;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleLoadPreset(pos)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                      isCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                        : 'bg-[#171c2b] border-white/[0.06] hover:border-emerald-500/30 hover:bg-[#1f2638]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-100 truncate">{pos.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{pos.desc}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#0a0e18] text-[9px] font-mono font-bold text-emerald-400 shrink-0">
                      {pos.tag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom FEN loader */}
            <form
              onSubmit={handleLoadCustomFen}
              className="space-y-1.5 pt-2.5 border-t border-white/[0.07]"
            >
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={fenInput}
                  onChange={(e) => setFenInput(e.target.value)}
                  placeholder="Paste custom FEN notation..."
                  className="flex-1 bg-[#0a0e18] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={!fenInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070a12] text-xs font-extrabold disabled:opacity-40 transition-colors"
                >
                  Load FEN
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
