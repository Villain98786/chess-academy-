import React, { useState, useEffect, useMemo } from 'react';
import { Chess } from 'chess.js';
import { AppSettings, CoachExplanation, GameMove, GameRecord, UserStats } from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { EvalBar } from '../components/Chessboard/EvalBar';
import { MoveHistory } from '../components/Chessboard/MoveHistory';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { grandmasterCoach } from '../services/grandmasterCoachService';
import { generateStructuredGameReview } from '../services/gameReviewService';
import { chessEngine } from '../services/engine';
import {
  calculateColorAccuracy,
  generateInstantMoveAnalysis,
  identifyOpeningFromMoves,
  detectCriticalMoments,
} from '../services/analytics';
import { NavPage } from '../components/Navigation/Sidebar';
import {
  LineChart as LineChartIcon,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CheckCircle,
  Sparkles,
  BookOpen,
  Zap,
  Compass,
  GraduationCap,
} from 'lucide-react';

interface AnalysisPageProps {
  settings: AppSettings;
  stats: UserStats;
  initialGame?: GameRecord;
  onNavigate?: (page: NavPage, context?: unknown) => void;
}

export const AnalysisPage: React.FC<AnalysisPageProps> = ({
  settings,
  stats,
  initialGame,
  onNavigate,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string>(
    initialGame?.id || stats.recentGames[0]?.id || 'seed-game-1'
  );

  const activeGame: GameRecord = useMemo(() => {
    if (initialGame && initialGame.id === selectedGameId) return initialGame;
    return (
      stats.recentGames.find((g) => g.id === selectedGameId) ||
      stats.recentGames[0] || {
        id: 'showcase-1',
        date: 'Today',
        playerColor: 'w',
        opponent: 'Stockfish Intermediate',
        opponentElo: 1000,
        result: 'win',
        reason: 'Checkmate',
        moves: [
          { from: 'e2', to: 'e4', san: 'e4', piece: 'p', color: 'w', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1' },
          { from: 'e7', to: 'e5', san: 'e5', piece: 'p', color: 'b', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2' },
          { from: 'g1', to: 'f3', san: 'Nf3', piece: 'n', color: 'w', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2' },
          { from: 'b8', to: 'c6', san: 'Nc6', piece: 'n', color: 'b', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3' },
          { from: 'f1', to: 'c4', san: 'Bc4', piece: 'b', color: 'w', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3' },
          { from: 'f8', to: 'c5', san: 'Bc5', piece: 'b', color: 'b', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4' },
          { from: 'd1', to: 'f3', san: 'Qf3', piece: 'q', color: 'w', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 5 4' },
          { from: 'd7', to: 'd6', san: 'd6', piece: 'p', color: 'b', fen: 'r1bqk1nr/ppp2ppp/2np4/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 5' },
          { from: 'f3', to: 'f7', san: 'Qxf7#', piece: 'q', color: 'w', fen: 'r1bqk1nr/ppp2Qpp/2np4/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 5' },
        ],
      }
    );
  }, [initialGame, selectedGameId, stats.recentGames]);

  const [currentPly, setCurrentPly] = useState<number>(activeGame.moves.length - 1);
  const [analyzedMoves, setAnalyzedMoves] = useState<GameMove[]>([]);
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [evalScores, setEvalScores] = useState<number[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [coachExplanation, setCoachExplanation] = useState<CoachExplanation>(() =>
    grandmasterCoach.createInitialState(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      activeGame.playerColor,
      'Select any move in the game history or critical moments list to see GM Elena’s tactical & positional breakdown.'
    )
  );

  // Opening identification
  const detectedOpening = useMemo(
    () => identifyOpeningFromMoves(activeGame.moves),
    [activeGame.moves]
  );

  // Run asynchronous move-by-move engine review without blocking UI
  useEffect(() => {
    let cancelled = false;
    setIsAnalyzing(true);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const evalList: number[] = [0];
      const evaluatedMoves: GameMove[] = [];
      const simChess = new Chess();
      let prevScore = 0;

      for (let i = 0; i < activeGame.moves.length; i++) {
        const m = activeGame.moves[i];
        try {
          const fenBefore = simChess.fen();
          const bestCand = chessEngine.computeQuickCandidates(fenBefore, 1)[0];

          simChess.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
          const currentScore = chessEngine.evaluatePosition(simChess);
          evalList.push(currentScore);

          const feedback = generateInstantMoveAnalysis({
            fenBefore,
            fenAfter: simChess.fen(),
            san: m.san,
            from: m.from,
            to: m.to,
            moverColor: m.color,
            prevEvalWhiteCp: prevScore,
            newEvalWhiteCp: currentScore,
            bestMoveFrom: bestCand?.from,
            bestMoveTo: bestCand?.to,
          });

          evaluatedMoves.push({
            ...m,
            fen: simChess.fen(),
            evalScore: currentScore,
            classification: m.classification || feedback.classification,
            bestAlternativeSan: m.bestAlternativeSan || feedback.bestMoveSan,
            bestAlternativeUci: m.bestAlternativeUci || feedback.bestMoveUci,
          });

          prevScore = currentScore;
        } catch {
          evaluatedMoves.push(m);
        }
      }

      if (cancelled) return;
      setEvalScores(evalList);
      setAnalyzedMoves(evaluatedMoves);
      setIsAnalyzing(false);

      if (evaluatedMoves.length > 0) {
        const lastIdx = evaluatedMoves.length - 1;
        const last = evaluatedMoves[lastIdx];
        const finalChess = new Chess();
        try {
          finalChess.load(last.fen);
        } catch {
          // Ignore
        }
        setChess(finalChess);
        setCurrentPly(lastIdx);

        const fenBefore =
          lastIdx > 0
            ? evaluatedMoves[lastIdx - 1].fen
            : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const prevCp = lastIdx > 0 ? evaluatedMoves[lastIdx - 1].evalScore || 0 : 0;

        setCoachExplanation(
          grandmasterCoach.analyzeUserMove({
            fenBefore,
            fenAfter: last.fen,
            san: last.san,
            from: last.from,
            to: last.to,
            moverColor: last.color,
            prevEvalWhiteCp: prevCp,
            newEvalWhiteCp: last.evalScore || 0,
            bestMoveFrom: last.bestAlternativeUci?.from,
            bestMoveTo: last.bestAlternativeUci?.to,
            moveCount: lastIdx + 1,
          })
        );
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeGame]);

  // Jump to specific ply and update GM Elena coaching explanation
  const handleSelectPly = (ply: number) => {
    if (ply < 0) {
      const startChess = new Chess();
      setChess(startChess);
      setCurrentPly(-1);
      setCoachExplanation(
        grandmasterCoach.createInitialState(
          startChess.fen(),
          activeGame.playerColor,
          `Opening: ${detectedOpening.eco} ${detectedOpening.name}. Step forward through the game to inspect each move.`
        )
      );
      return;
    }
    const targetMove = analyzedMoves[ply];
    if (targetMove) {
      const c = new Chess();
      c.load(targetMove.fen);
      setChess(c);
      setCurrentPly(ply);

      const fenBefore =
        ply > 0
          ? analyzedMoves[ply - 1].fen
          : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const prevCp = ply > 0 ? analyzedMoves[ply - 1].evalScore || 0 : 0;

      if (targetMove.color === activeGame.playerColor) {
        setCoachExplanation(
          grandmasterCoach.analyzeUserMove({
            fenBefore,
            fenAfter: targetMove.fen,
            san: targetMove.san,
            from: targetMove.from,
            to: targetMove.to,
            moverColor: targetMove.color,
            prevEvalWhiteCp: prevCp,
            newEvalWhiteCp: targetMove.evalScore || 0,
            bestMoveFrom: targetMove.bestAlternativeUci?.from,
            bestMoveTo: targetMove.bestAlternativeUci?.to,
            moveCount: ply + 1,
          })
        );
      } else {
        setCoachExplanation(
          grandmasterCoach.analyzeOpponentMove({
            fenBefore,
            fenAfter: targetMove.fen,
            san: targetMove.san,
            from: targetMove.from,
            to: targetMove.to,
            opponentColor: targetMove.color,
            evalWhiteCp: targetMove.evalScore || 0,
            moveCount: ply + 1,
          })
        );
      }
    }
  };

  const currentMove = currentPly >= 0 ? analyzedMoves[currentPly] : null;
  const currentScore = currentMove?.evalScore ?? 0;

  // Critical moments list
  const criticalPlies = useMemo(
    () => detectCriticalMoments(analyzedMoves),
    [analyzedMoves]
  );

  // Structured Post-Game Review with Phase Scores & Recommended Lessons
  const structuredReview = useMemo(
    () =>
      generateStructuredGameReview({
        moves: analyzedMoves,
        playerColor: activeGame.playerColor,
        result: activeGame.result,
        reason: activeGame.reason,
      }),
    [analyzedMoves, activeGame.playerColor, activeGame.result, activeGame.reason]
  );

  // Full Chess.com-style Accuracy & Classification breakdown
  const accuracyStats = useMemo(() => {
    const initCounts = () => ({
      brilliant: 0,
      great: 0,
      excellent: 0,
      best: 0,
      good: 0,
      inaccuracy: 0,
      missed_win: 0,
      mistake: 0,
      blunder: 0,
    });
    const counts = {
      w: initCounts(),
      b: initCounts(),
    };

    analyzedMoves.forEach((m) => {
      const cls = m.classification || 'good';
      counts[m.color][cls] = (counts[m.color][cls] || 0) + 1;
    });

    return {
      white: {
        accuracy: calculateColorAccuracy(analyzedMoves, 'w'),
        ...counts.w,
      },
      black: {
        accuracy: calculateColorAccuracy(analyzedMoves, 'b'),
        ...counts.b,
      },
    };
  }, [analyzedMoves]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Overview Banner & Game Picker */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow-md">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <LineChartIcon className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Post-Game Engine Review</h2>
                <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-semibold text-emerald-300 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-emerald-400" />
                  {detectedOpening.eco}: {detectedOpening.name}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                vs {activeGame.opponent} ({activeGame.opponentElo}) •{' '}
                <span className="font-bold text-emerald-400 uppercase">{activeGame.result}</span> (
                {activeGame.reason}) {isAnalyzing && '• Analyzing...'}
              </p>
            </div>
          </div>

          {stats.recentGames.length > 1 && (
            <select
              aria-label="Select Game to Analyze"
              value={selectedGameId}
              onChange={(e) => setSelectedGameId(e.target.value)}
              className="text-xs bg-neutral-950 text-neutral-200 border border-neutral-700 rounded-xl px-3 py-1.5 focus:border-emerald-500 outline-hidden"
            >
              {stats.recentGames.map((g, i) => (
                <option key={g.id} value={g.id}>
                  Game #{stats.recentGames.length - i}: vs {g.opponent} ({g.result.toUpperCase()})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* CAPS Accuracy Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400">White Accuracy</div>
              <div className="text-sm font-black text-white font-mono">
                {accuracyStats.white.accuracy}%
              </div>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-600 shadow-xs" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-400">Black Accuracy</div>
              <div className="text-sm font-black text-neutral-200 font-mono">
                {accuracyStats.black.accuracy}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Replay Board & Controls */}
        <div className="lg:col-span-7 flex flex-col items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="w-full max-w-[520px] flex flex-wrap items-center justify-between gap-2 text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">
                {currentMove
                  ? `Ply ${currentPly + 1} (${currentMove.color === 'w' ? 'White' : 'Black'}): ${currentMove.san}`
                  : 'Initial Position'}
              </span>
              {currentMove?.classification && (
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    currentMove.classification === 'brilliant'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : currentMove.classification === 'great'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : currentMove.classification === 'best' ||
                        currentMove.classification === 'excellent'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : currentMove.classification === 'blunder'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : currentMove.classification === 'mistake' ||
                        currentMove.classification === 'missed_win'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {currentMove.classification.replace('_', ' ')}
                </span>
              )}
              {currentMove?.bestAlternativeSan &&
                currentMove.bestAlternativeSan !== currentMove.san && (
                  <span className="text-[11px] text-cyan-300 font-mono flex items-center gap-1">
                    <Compass className="w-3 h-3" />
                    Best: {currentMove.bestAlternativeSan}
                  </span>
                )}
            </div>
            <div className="font-mono text-emerald-400 text-xs font-bold">
              Eval: {chessEngine.formatScore(currentScore)}
            </div>
          </div>

          <div className="flex gap-3 items-stretch justify-center w-full">
            <EvalBar
              score={currentScore}
              orientation={activeGame.playerColor}
              className="h-auto min-h-[320px] max-h-[520px]"
            />
            <div className="flex-1 max-w-[520px] aspect-square flex items-center justify-center">
              <Chessboard
                chess={chess}
                orientation={activeGame.playerColor}
                theme={settings.boardTheme}
                showCoordinates={settings.showCoordinates}
                interactive={false}
                lastMove={
                  currentMove ? { from: currentMove.from, to: currentMove.to } : null
                }
                bestMove={
                  currentMove?.bestAlternativeUci &&
                  currentMove.bestAlternativeSan !== currentMove.san
                    ? currentMove.bestAlternativeUci
                    : null
                }
                lastMoveClassification={currentMove?.classification || null}
              />
            </div>
          </div>

          {/* Playback Navigation */}
          <div className="w-full max-w-[520px] flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleSelectPly(-1)}
              disabled={currentPly === -1}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              title="First move"
            >
              <ChevronFirst className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSelectPly(Math.max(-1, currentPly - 1))}
              disabled={currentPly === -1}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              title="Previous ply"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-3 text-neutral-400">
              {currentPly + 1} / {analyzedMoves.length}
            </span>
            <button
              type="button"
              onClick={() => handleSelectPly(Math.min(analyzedMoves.length - 1, currentPly + 1))}
              disabled={currentPly >= analyzedMoves.length - 1}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              title="Next ply"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleSelectPly(analyzedMoves.length - 1)}
              disabled={currentPly >= analyzedMoves.length - 1}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              title="Last move"
            >
              <ChevronLast className="w-4 h-4" />
            </button>
          </div>

          {/* Critical Moments Jumper */}
          {criticalPlies.length > 0 && (
            <div className="w-full max-w-[520px] bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Key Critical Moments ({criticalPlies.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {criticalPlies.map((plyIdx) => {
                  const m = analyzedMoves[plyIdx];
                  if (!m) return null;
                  const moveNum = Math.floor(plyIdx / 2) + 1;
                  return (
                    <button
                      key={plyIdx}
                      type="button"
                      onClick={() => handleSelectPly(plyIdx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono border transition-colors ${
                        currentPly === plyIdx
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      {moveNum}
                      {m.color === 'w' ? '.' : '...'} {m.san} ({m.classification})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Phase Performance & Personalized Recommended Lessons */}
          <div className="w-full max-w-[520px] bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                {
                  label: 'Opening',
                  score: structuredReview.phasePerformance.openingScore,
                  grade: structuredReview.phasePerformance.openingGrade,
                },
                {
                  label: 'Tactics',
                  score: structuredReview.phasePerformance.tacticalScore,
                  grade: structuredReview.phasePerformance.tacticalGrade,
                },
                {
                  label: 'Endgame',
                  score: structuredReview.phasePerformance.endgameScore,
                  grade: structuredReview.phasePerformance.endgameGrade,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-2 rounded-lg bg-neutral-900 border border-neutral-800"
                >
                  <div className="text-[10px] font-bold uppercase text-neutral-400">
                    {item.label}
                  </div>
                  <div className="text-sm font-black text-emerald-400 font-mono">
                    {item.score}%
                  </div>
                  <div className="text-[10px] text-neutral-400">{item.grade}</div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Recommended Lessons for Improvement</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {structuredReview.recommendedLessons.map((rec) => (
                  <button
                    key={rec.lessonId}
                    type="button"
                    onClick={() =>
                      onNavigate?.('learn', {
                        courseId: rec.courseId,
                        lessonId: rec.lessonId,
                      })
                    }
                    className="p-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 text-left transition-all"
                  >
                    <div className="text-[10px] font-bold uppercase text-emerald-400">
                      Level {rec.levelNumber} • {rec.courseId}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">{rec.title}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5 line-clamp-2">
                      {rec.reason}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Grandmaster Coach, Evaluation Graph, Classification Breakdown & Move List */}
        <div className="lg:col-span-5 space-y-4">
          <GrandmasterCoach
            fen={chess.fen()}
            explanation={coachExplanation}
            onRequestHint={(_lvl, hintExp) => setCoachExplanation(hintExp)}
            onExplainPosition={(planExp) => setCoachExplanation(planExp)}
            onOpenLesson={(courseId, lessonId) =>
              onNavigate?.('learn', { courseId, lessonId })
            }
          />

          {/* Centipawn Evaluation Chart */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-300 uppercase tracking-wider">
                Centipawn Advantage Graph
              </span>
              <span className="font-mono text-neutral-500 text-[10px]">
                Click move below to scrub
              </span>
            </div>

            <div className="relative h-24 w-full bg-neutral-950 rounded-xl border border-neutral-850 p-2 overflow-hidden flex items-center">
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-neutral-700 pointer-events-none" />

              {evalScores.length > 1 && (
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox={`0 0 ${evalScores.length - 1} 100`}
                >
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={evalScores
                      .map((val, idx) => {
                        const clamped = Math.max(-1000, Math.min(1000, val));
                        const y = 50 - (clamped / 1000) * 45;
                        return `${idx},${y}`;
                      })
                      .join(' ')}
                  />
                  {currentPly >= 0 && (
                    <circle
                      cx={currentPly + 1}
                      cy={
                        50 -
                        (Math.max(-1000, Math.min(1000, evalScores[currentPly + 1] || 0)) /
                          1000) *
                          45
                      }
                      r="4"
                      fill="#ffffff"
                      stroke="#10b981"
                      strokeWidth="2"
                    />
                  )}
                </svg>
              )}
            </div>
          </div>

          {/* Complete Move Classification Breakdown */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-md space-y-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Move Quality Summary (White / Black)
            </h4>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center text-xs">
              <div className="p-2 rounded-xl bg-neutral-950 border border-cyan-500/30">
                <div className="text-[10px] text-cyan-300 font-bold flex items-center justify-center gap-0.5">
                  <Sparkles className="w-3 h-3" /> !!
                </div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.brilliant} / {accuracyStats.black.brilliant}
                </div>
                <div className="text-[9px] text-neutral-500">Brilliant</div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-950 border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                  <CheckCircle className="w-3 h-3" /> ★
                </div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.best + accuracyStats.white.great} /{' '}
                  {accuracyStats.black.best + accuracyStats.black.great}
                </div>
                <div className="text-[9px] text-neutral-500">Best/Great</div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-950 border border-teal-500/30">
                <div className="text-[10px] text-teal-300 font-bold">! / ✓</div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.excellent + accuracyStats.white.good} /{' '}
                  {accuracyStats.black.excellent + accuracyStats.black.good}
                </div>
                <div className="text-[9px] text-neutral-500">Exc/Good</div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-950 border border-amber-500/30">
                <div className="text-[10px] text-amber-400 font-bold flex items-center justify-center gap-0.5">
                  <HelpCircle className="w-3 h-3" /> ?!
                </div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.inaccuracy} / {accuracyStats.black.inaccuracy}
                </div>
                <div className="text-[9px] text-neutral-500">Inacc.</div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-950 border border-yellow-500/30">
                <div className="text-[10px] text-yellow-300 font-bold">⚡</div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.missed_win} / {accuracyStats.black.missed_win}
                </div>
                <div className="text-[9px] text-neutral-500">Missed</div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-950 border border-orange-500/30">
                <div className="text-[10px] text-orange-400 font-bold flex items-center justify-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> ?
                </div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.mistake} / {accuracyStats.black.mistake}
                </div>
                <div className="text-[9px] text-neutral-500">Mistake</div>
              </div>

              <div className="p-2 rounded-xl bg-neutral-950 border border-rose-500/30">
                <div className="text-[10px] text-rose-400 font-bold flex items-center justify-center gap-0.5">
                  <XCircle className="w-3 h-3" /> ??
                </div>
                <div className="text-xs font-black text-white font-mono mt-0.5">
                  {accuracyStats.white.blunder} / {accuracyStats.black.blunder}
                </div>
                <div className="text-[9px] text-neutral-500">Blunder</div>
              </div>
            </div>
          </div>

          {/* Interactive Move History Table */}
          <MoveHistory
            moves={analyzedMoves}
            currentMoveIndex={currentPly}
            onSelectMove={handleSelectPly}
          />
        </div>
      </div>
    </div>
  );
};
