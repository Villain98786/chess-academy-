import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import confetti from 'canvas-confetti';
import { CHESS_PUZZLES } from '../data/puzzles';
import { ChessPuzzle, AppSettings, UserStats, CoachExplanation } from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { EvalBar } from '../components/Chessboard/EvalBar';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { StorageService } from '../services/storage';
import { soundManager } from '../services/sound';
import { chessEngine } from '../services/engine';
import {
  evaluateUserPuzzleMove,
  validatePuzzleDefinition,
  isMatePuzzle,
  getStepHint,
  ExecutedMoveRecord,
} from '../services/puzzleEngine';
import {
  Puzzle,
  RotateCcw,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  Compass,
  ShieldAlert,
  Cpu,
  Award,
  ListOrdered,
  Flame,
  Clock,
  Target,
} from 'lucide-react';

interface PuzzlesPageProps {
  settings: AppSettings;
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  initialContext?: { category?: string; puzzleId?: string } | null;
}

const CATEGORIES = [
  { id: 'all', label: 'All Puzzles' },
  { id: 'daily', label: 'Daily Challenge' },
  { id: 'mate1', label: 'Mate in 1' },
  { id: 'mate2', label: 'Mate in 2' },
  { id: 'mate3', label: 'Mate in 3' },
  { id: 'mate4', label: 'Mate in 4+' },
  { id: 'fork', label: 'Fork' },
  { id: 'pin', label: 'Pin' },
  { id: 'skewer', label: 'Skewer' },
  { id: 'discovered', label: 'Discovered Attack' },
  { id: 'double_attack', label: 'Double Attack' },
  { id: 'defensive', label: 'Defensive Tactics' },
];

export const PuzzlesPage: React.FC<PuzzlesPageProps> = ({
  settings,
  stats,
  onUpdateStats,
  initialContext,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialContext?.category || 'all'
  );
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState<number>(0);
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [solutionStep, setSolutionStep] = useState<number>(0);
  const [status, setStatus] = useState<'solving' | 'correct' | 'wrong'>('solving');
  const [isOpponentMoving, setIsOpponentMoving] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [executedMoves, setExecutedMoves] = useState<ExecutedMoveRecord[]>([]);
  const [latestOpponentNote, setLatestOpponentNote] = useState<{
    san: string;
    explanation: string;
  } | null>(null);
  const [wrongFeedback, setWrongFeedback] = useState<{
    playedSan: string;
    reason: string;
    hint: string;
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  const clearPendingTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Validate puzzles before displaying
  const verifiedPuzzles = useMemo(() => {
    return CHESS_PUZZLES.filter((p) => validatePuzzleDefinition(p).valid);
  }, []);

  useEffect(() => {
    if (initialContext?.category) {
      setSelectedCategory(initialContext.category);
      const list =
        initialContext.category === 'all'
          ? verifiedPuzzles
          : verifiedPuzzles.filter((p) => p.category === initialContext.category);
      const idx = initialContext.puzzleId
        ? list.findIndex((p) => p.id === initialContext.puzzleId)
        : 0;
      setCurrentPuzzleIndex(idx >= 0 ? idx : 0);
    }
  }, [initialContext, verifiedPuzzles]);

  const filteredPuzzles = useMemo(() => {
    if (selectedCategory === 'all') return verifiedPuzzles;
    return verifiedPuzzles.filter((p) => p.category === selectedCategory);
  }, [selectedCategory, verifiedPuzzles]);

  const activePuzzle: ChessPuzzle =
    filteredPuzzles[currentPuzzleIndex] || verifiedPuzzles[0] || CHESS_PUZZLES[0];

  const loadPuzzle = useCallback((puzzle: ChessPuzzle) => {
    clearPendingTimer();
    const newChess = new Chess();
    try {
      newChess.load(puzzle.fen);
    } catch {
      newChess.reset();
    }
    setChess(newChess);
    setSolutionStep(0);
    setStatus('solving');
    setIsOpponentMoving(false);
    setLastMove(null);
    setHintMove(null);
    setShowHint(false);
    setExecutedMoves([]);
    setLatestOpponentNote(null);
    setWrongFeedback(null);
    setElapsedSeconds(0);
  }, []);

  useEffect(() => {
    if (activePuzzle) {
      loadPuzzle(activePuzzle);
    }
    return () => clearPendingTimer();
  }, [activePuzzle, loadPuzzle]);

  // Live solver stopwatch timer
  useEffect(() => {
    if (status === 'correct') return;
    const sw = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(sw);
  }, [status, activePuzzle.id]);

  // Reconstruct board up to current solutionStep (used for Retry after wrong move)
  const revertToCurrentStep = useCallback(
    (stepToRestore: number) => {
      clearPendingTimer();
      const restoredChess = new Chess();
      restoredChess.load(activePuzzle.fen);
      let lastRestoredMove: { from: Square; to: Square } | null = null;
      for (let i = 0; i < stepToRestore; i++) {
        const m = restoredChess.move(activePuzzle.solutionMoves[i]);
        if (m) {
          lastRestoredMove = { from: m.from as Square, to: m.to as Square };
        }
      }
      setChess(restoredChess);
      setLastMove(lastRestoredMove);
      setStatus('solving');
      setIsOpponentMoving(false);
    },
    [activePuzzle]
  );

  const handleRetryWrongMove = () => {
    revertToCurrentStep(solutionStep);
    setWrongFeedback(null);
  };

  // Show visual board arrow hint for the current step
  const handleShowBoardArrow = () => {
    setShowHint(true);
    const expectedSan = activePuzzle.solutionMoves[solutionStep];
    if (!expectedSan) return;
    try {
      const temp = new Chess(chess.fen());
      const m = temp.move(expectedSan);
      if (m) {
        setHintMove({ from: m.from as Square, to: m.to as Square });
      }
    } catch {
      // Ignore
    }
  };

  // Handle user move in puzzle
  const handleUserMove = (move: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (status === 'correct' || isOpponentMoving) return;

    const baseChess = new Chess();
    baseChess.load(activePuzzle.fen);
    for (let i = 0; i < solutionStep; i++) {
      baseChess.move(activePuzzle.solutionMoves[i]);
    }
    const currentFen = baseChess.fen();

    const evalResult = evaluateUserPuzzleMove(
      activePuzzle,
      currentFen,
      solutionStep,
      move
    );

    if (evalResult.status === 'illegal' || !evalResult.userMove) {
      return;
    }

    const userMoveInfo = evalResult.userMove;
    const afterUserChess = new Chess(userMoveInfo.fenAfterUser);
    setChess(afterUserChess);
    setLastMove({ from: userMoveInfo.from, to: userMoveInfo.to });
    setHintMove(null);

    if (evalResult.status === 'wrong') {
      setStatus('wrong');
      setWrongFeedback({
        playedSan: userMoveInfo.san,
        reason:
          evalResult.wrongReason ||
          `${userMoveInfo.san} is not the correct continuation.`,
        hint: evalResult.stepHint || getStepHint(activePuzzle, solutionStep),
      });
      soundManager.playPuzzleWrong();
      const updatedStats = StorageService.recordPuzzleResult(false, activePuzzle.rating);
      onUpdateStats(updatedStats);

      clearPendingTimer();
      timerRef.current = window.setTimeout(() => {
        revertToCurrentStep(solutionStep);
      }, 850);
      return;
    }

    setWrongFeedback(null);
    const userMoveNumber = Math.floor(solutionStep / 2) + 1;
    const userRecord: ExecutedMoveRecord = {
      plyIndex: solutionStep,
      moveNumber: userMoveNumber,
      actor: 'user',
      san: userMoveInfo.san,
      uci: userMoveInfo.uci,
      from: userMoveInfo.from,
      to: userMoveInfo.to,
      fenAfter: userMoveInfo.fenAfterUser,
      isCheck: userMoveInfo.isCheck,
      isCheckmate: userMoveInfo.isCheckmate,
    };

    if (evalResult.status === 'solved') {
      if (isMatePuzzle(activePuzzle) && !afterUserChess.isCheckmate()) {
        return;
      }

      setExecutedMoves((prev) => [...prev, userRecord]);
      setSolutionStep(evalResult.nextStep);
      setStatus('correct');
      soundManager.playPuzzleCorrect();
      confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } });

      const updatedStats = StorageService.recordPuzzleResult(true, activePuzzle.rating);
      onUpdateStats(updatedStats);
      return;
    }

    setExecutedMoves((prev) => [...prev, userRecord]);
    setSolutionStep(solutionStep + 1);
    setIsOpponentMoving(true);

    const oppReply = evalResult.opponentReply;
    if (oppReply) {
      clearPendingTimer();
      timerRef.current = window.setTimeout(() => {
        const afterOppChess = new Chess(oppReply.fenAfterOpponent);
        setChess(afterOppChess);
        setLastMove({ from: oppReply.from, to: oppReply.to });
        if (oppReply.isCheck) {
          soundManager.playCheck();
        } else {
          soundManager.playMove();
        }

        const oppRecord: ExecutedMoveRecord = {
          plyIndex: oppReply.plyIndex,
          moveNumber: userMoveNumber,
          actor: 'opponent',
          san: oppReply.san,
          uci: oppReply.uci,
          from: oppReply.from,
          to: oppReply.to,
          fenAfter: oppReply.fenAfterOpponent,
          explanation: oppReply.explanation,
          isCheck: oppReply.isCheck,
          isCheckmate: afterOppChess.isCheckmate(),
        };

        setExecutedMoves((prev) => [...prev, oppRecord]);
        setLatestOpponentNote({
          san: oppReply.san,
          explanation: oppReply.explanation,
        });
        setSolutionStep(evalResult.nextStep);
        setIsOpponentMoving(false);
      }, 500);
    }
  };

  const handleNextPuzzle = () => {
    if (currentPuzzleIndex < filteredPuzzles.length - 1) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
    } else {
      setCurrentPuzzleIndex(0);
    }
  };

  const handleResetPuzzle = () => {
    loadPuzzle(activePuzzle);
  };

  const completedUserMoves = Math.floor((solutionStep + 1) / 2);
  const currentTargetUserMove = Math.min(
    activePuzzle.requiredMovesCount,
    Math.floor(solutionStep / 2) + 1
  );
  const isFinalBoardCheckmate = chess.isCheckmate();
  const evalScore = useMemo(() => chessEngine.evaluatePosition(chess), [chess]);

  const movePairs = useMemo(() => {
    const pairs: Array<{
      moveNumber: number;
      userMove?: ExecutedMoveRecord;
      opponentMove?: ExecutedMoveRecord;
    }> = [];
    for (let i = 0; i < executedMoves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        userMove: executedMoves[i],
        opponentMove: executedMoves[i + 1],
      });
    }
    return pairs;
  }, [executedMoves]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const puzzleAccuracyPct =
    stats.puzzlesAttempted > 0
      ? Math.round((stats.puzzlesSolved / stats.puzzlesAttempted) * 100)
      : 100;

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1520px] mx-auto">
      {/* Compact Tactical Status & Category Filter Bar */}
      <div className="bg-[#111624] border border-white/[0.08] p-3.5 sm:p-4 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <Target className="w-3.5 h-3.5" />
              <span>Tactics Rating: {stats.puzzleElo}</span>
            </span>
            <span className="flex items-center gap-1.5 font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{stats.puzzlesSolved} Solved ({puzzleAccuracyPct}%)</span>
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-300 bg-[#0a0e18] border border-white/10 px-3 py-1 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.06]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setCurrentPuzzleIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-[#070a12]'
                  : 'text-slate-400 hover:text-white hover:bg-[#171c2b]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 12-Col Tactical Puzzle Arena — Chessboard Primary Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Interactive Board & Solution Verification Banners */}
        <div className="lg:col-span-7 flex flex-col items-center bg-[#111624] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 space-y-3.5">
          {/* Puzzle Header Bar */}
          <div className="w-full max-w-[540px] flex flex-wrap items-center justify-between gap-2 text-xs px-3.5 py-2.5 bg-[#171c2b] border border-white/[0.07] rounded-xl">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Puzzle className="w-4 h-4" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span data-testid="puzzle-title" className="font-bold text-slate-100 text-sm">
                    {activePuzzle.title}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {activePuzzle.mateDepth
                      ? `Mate in ${activePuzzle.mateDepth}`
                      : `${activePuzzle.requiredMovesCount}-Move Tactic`}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Theme: <strong className="text-slate-200">{activePuzzle.theme}</strong> •{' '}
                  {activePuzzle.playerColor === 'w' ? 'White to Move' : 'Black to Move'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#0a0e18] text-amber-300 border border-amber-500/30">
                {activePuzzle.difficulty}
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#0a0e18] text-cyan-300 border border-cyan-500/30">
                Elo {activePuzzle.rating}
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-400">
                {status === 'correct'
                  ? isFinalBoardCheckmate
                    ? 'Checkmate!'
                    : 'Solved!'
                  : isOpponentMoving
                  ? 'Opponent responding...'
                  : `Move ${currentTargetUserMove}/${activePuzzle.requiredMovesCount}`}
              </span>
            </div>
          </div>

          {/* Step Progress Bar for Multi-Move Puzzles */}
          <div className="w-full max-w-[540px] flex items-center gap-2 px-1">
            {Array.from({ length: activePuzzle.requiredMovesCount }).map((_, idx) => {
              const stepDone =
                status === 'correct' || idx < Math.floor(solutionStep / 2);
              const stepActive =
                status !== 'correct' && idx === Math.floor(solutionStep / 2);
              return (
                <div
                  key={idx}
                  className={`flex-1 h-2 rounded-full transition-all ${
                    stepDone
                      ? 'bg-emerald-400'
                      : stepActive
                      ? 'bg-amber-400'
                      : 'bg-[#0a0e18]'
                  }`}
                  title={`Move ${idx + 1} of ${activePuzzle.requiredMovesCount}`}
                />
              );
            })}
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {status === 'correct'
                ? `${activePuzzle.requiredMovesCount}/${activePuzzle.requiredMovesCount} Moves`
                : `${completedUserMoves}/${activePuzzle.requiredMovesCount} Moves`}
            </span>
          </div>

          {/* Board + EvalBar */}
          <div className="flex gap-2.5 sm:gap-3.5 items-stretch justify-center w-full">
            {settings.showEvalBar && (
              <EvalBar
                score={evalScore}
                orientation={activePuzzle.playerColor}
                className="h-auto min-h-[280px] max-h-[520px]"
              />
            )}
            <div className="flex-1 max-w-[520px] aspect-square flex items-center justify-center">
              <Chessboard
                chess={chess}
                orientation={activePuzzle.playerColor}
                theme={settings.boardTheme}
                showCoordinates={settings.showCoordinates}
                showLegalMoves={settings.showLegalMoves}
                autoQueen={settings.autoQueen}
                interactive={status !== 'correct' && !isOpponentMoving}
                lastMove={lastMove}
                hintMove={hintMove}
                lastMoveClassification={
                  status === 'correct'
                    ? 'brilliant'
                    : status === 'wrong'
                    ? 'blunder'
                    : executedMoves.length > 0
                    ? 'best'
                    : null
                }
                onMove={handleUserMove}
                className={status === 'wrong' ? 'animate-shake' : ''}
              />
            </div>
          </div>

          {/* Opponent Response Explanation Banner (shown during multi-move sequence) */}
          {status !== 'correct' && latestOpponentNote && !wrongFeedback && (
            <div
              data-testid="opponent-response-banner"
              className="w-full max-w-[540px] p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-start gap-3 animate-in fade-in"
            >
              <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <div className="font-bold text-cyan-300">
                  Opponent played{' '}
                  <span className="font-mono text-white">{latestOpponentNote.san}</span> — Your
                  turn for Move {currentTargetUserMove} of {activePuzzle.requiredMovesCount}
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {latestOpponentNote.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Wrong Move Diagnostic Banner */}
          {wrongFeedback && status !== 'correct' && (
            <div
              data-testid="wrong-move-banner"
              className="w-full max-w-[540px] p-3.5 rounded-xl bg-rose-950/70 border border-rose-500/50 space-y-2 animate-in fade-in"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Incorrect move ({wrongFeedback.playedSan})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetryWrongMove}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                  >
                    Retry Move
                  </button>
                  <button
                    type="button"
                    onClick={handleShowBoardArrow}
                    className="px-3 py-1 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors"
                  >
                    Show Hint
                  </button>
                </div>
              </div>
              <p className="text-xs text-rose-100 leading-relaxed">
                <span className="font-semibold text-white">Why it fails:</span>{' '}
                {wrongFeedback.reason}
              </p>
              <p className="text-xs text-amber-200/90 bg-amber-950/40 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
                💡 <span className="font-semibold">Hint:</span> {wrongFeedback.hint}
              </p>
            </div>
          )}

          {/* Complete Puzzle Solved Screen */}
          {status === 'correct' && (
            <div
              data-testid="puzzle-solved-banner"
              className="w-full max-w-[540px] p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/60 space-y-3 animate-in fade-in"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800/60 pb-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                  <CheckCircle className="w-5 h-5" />
                  <span>Puzzle Solved!</span>
                </div>
                <div className="flex items-center gap-2">
                  {isFinalBoardCheckmate && (
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-emerald-400" />
                      Checkmate Verified
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-[#0a0e18] border border-white/10 text-amber-300 text-[11px] font-semibold">
                    {activePuzzle.difficulty} ({activePuzzle.rating} Elo)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#0a0e18] border border-white/10 text-slate-200 text-[11px] font-mono">
                    {activePuzzle.requiredMovesCount}{' '}
                    {activePuzzle.requiredMovesCount === 1 ? 'Move' : 'Moves'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-emerald-100 leading-relaxed">
                {activePuzzle.explanation}
              </p>

              {/* Complete Solution Move History */}
              <div className="bg-[#0a0e18] border border-emerald-800/50 rounded-lg p-3 space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Complete Solution Move Sequence</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {isFinalBoardCheckmate
                      ? 'Final Position: Checkmate (#)'
                      : 'Tactical Sequence Complete'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-white">
                  {movePairs.map((pair) => (
                    <span
                      key={pair.moveNumber}
                      className="px-2 py-1 rounded bg-[#171c2b] border border-white/10"
                    >
                      <span className="text-slate-500 mr-1">{pair.moveNumber}.</span>
                      <span className="text-emerald-400 font-bold">{pair.userMove?.san}</span>
                      {pair.opponentMove && (
                        <span className="text-cyan-300 ml-1.5">{pair.opponentMove.san}</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResetPuzzle}
                  className="px-3.5 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay Sequence</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextPuzzle}
                  data-testid="next-puzzle-btn"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#070a12] font-extrabold text-xs inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Next Tactical Puzzle</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 5 Cols: Puzzle Move Sequence Log, Controls & Grandmaster Coach */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls & Progress Card */}
          <div className="bg-[#111624] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Puzzle {currentPuzzleIndex + 1} of {filteredPuzzles.length}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Solved: {stats.puzzlesSolved}
              </span>
            </div>

            {/* Quick Puzzle Picker within Current Category */}
            {filteredPuzzles.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {filteredPuzzles.map((puz, idx) => (
                  <button
                    key={puz.id}
                    type="button"
                    onClick={() => setCurrentPuzzleIndex(idx)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 border transition-colors ${
                      idx === currentPuzzleIndex
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'bg-[#171c2b] border-white/[0.06] text-slate-400 hover:text-white'
                    }`}
                  >
                    #{idx + 1} {puz.title}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className="flex-1 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>{showHint ? 'Hide Clue' : 'Text Clue'}</span>
              </button>
              <button
                type="button"
                onClick={handleShowBoardArrow}
                className="flex-1 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Arrow Hint</span>
              </button>
              <button
                type="button"
                onClick={handleResetPuzzle}
                className="px-3 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-300 border border-white/10 text-xs font-semibold flex items-center justify-center transition-colors"
                title="Restart Puzzle"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {showHint && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed animate-in fade-in">
                💡 <span className="font-semibold">Clue:</span>{' '}
                {getStepHint(activePuzzle, solutionStep)}
              </div>
            )}

            {/* Live Move Sequence Log */}
            <div className="bg-[#0a0e18] border border-white/[0.07] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Move Log Validation</span>
                </span>
                <span className="font-mono text-slate-500">
                  {executedMoves.length}/{activePuzzle.solutionMoves.length} plies
                </span>
              </div>

              {executedMoves.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">
                  Play Move 1 of {activePuzzle.requiredMovesCount} on the board to begin the forcing sequence.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {executedMoves.map((rec) => (
                    <div
                      key={rec.plyIndex}
                      className={`px-3 py-2 rounded-lg text-xs border flex flex-col gap-0.5 ${
                        rec.actor === 'user'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">
                          {rec.actor === 'user'
                            ? `Move ${rec.moveNumber} (You • Verified)`
                            : `Move ${rec.moveNumber}... (Opponent Defense)`}
                        </span>
                        <span className="font-mono font-bold text-white">{rec.san}</span>
                      </div>
                      {rec.explanation && (
                        <p className="text-[11px] text-cyan-200/80 leading-snug">
                          {rec.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Grandmaster Chess Coach */}
          <GrandmasterCoach
            fen={chess.fen()}
            explanation={
              {
                id: `puzzle-${activePuzzle.id}-${solutionStep}-${status}`,
                state:
                  status === 'correct'
                    ? 'CELEBRATING'
                    : status === 'wrong'
                    ? 'WARNING'
                    : 'TEACHING',
                reaction:
                  status === 'correct'
                    ? 'celebrating'
                    : status === 'wrong'
                    ? 'warning'
                    : 'explaining',
                headline: `${activePuzzle.title} (${activePuzzle.theme})`,
                speechBubble:
                  status === 'wrong' && wrongFeedback
                    ? wrongFeedback.reason
                    : latestOpponentNote
                    ? `Opponent replied ${latestOpponentNote.san}: ${latestOpponentNote.explanation}`
                    : `Tactical Objective (${activePuzzle.difficulty}): Find the ${
                        activePuzzle.mateDepth
                          ? `forced Mate in ${activePuzzle.mateDepth}`
                          : `winning ${activePuzzle.theme.toLowerCase()} sequence`
                      } (${activePuzzle.requiredMovesCount} move${
                        activePuzzle.requiredMovesCount > 1 ? 's' : ''
                      } required).`,
                detailedExplanation: activePuzzle.explanation,
                conceptTag: activePuzzle.theme,
                fen: chess.fen(),
                moveCount: solutionStep,
                shouldSpeak: false,
              } as CoachExplanation
            }
            onHighlightSquares={(arrow) => setHintMove(arrow)}
          />
        </div>
      </div>
    </div>
  );
};
