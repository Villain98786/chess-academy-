import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { NavPage } from '../components/Navigation/Sidebar';
import { UserStats, AppSettings, EngineDifficulty } from '../types/chess';
import { CHESS_PUZZLES } from '../data/puzzles';
import { CHESS_COURSES } from '../data/lessons';
import { Chessboard } from '../components/Chessboard/Chessboard';
import {
  Play,
  Puzzle,
  GraduationCap,
  ChevronRight,
  Bot,
  Flame,
  Zap,
  Compass,
} from 'lucide-react';

interface DashboardPageProps {
  stats: UserStats;
  settings: AppSettings;
  onNavigate: (page: NavPage, context?: unknown) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats,
  settings,
  onNavigate,
}) => {
  const [selectedBotDiff, setSelectedBotDiff] = useState<EngineDifficulty>('intermediate');

  const dailyPuzzle = useMemo(
    () => CHESS_PUZZLES.find((p) => p.category === 'daily') || CHESS_PUZZLES[0],
    []
  );
  const dailyPuzzleChess = useMemo(() => {
    const c = new Chess();
    try {
      c.load(dailyPuzzle.fen);
    } catch {
      c.reset();
    }
    return c;
  }, [dailyPuzzle.fen]);

  const totalLessons = CHESS_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const lessonsPercentage = Math.round((stats.lessonsCompleted.length / totalLessons) * 100);

  const totalGames = stats.gamesPlayed;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;

  const botOptions: { id: EngineDifficulty; elo: number; label: string }[] = [
    { id: 'easy', elo: 600, label: '600' },
    { id: 'intermediate', elo: 1000, label: '1000' },
    { id: 'advanced', elo: 1400, label: '1400' },
    { id: 'expert', elo: 1800, label: '1800' },
    { id: 'master', elo: 2200, label: '2200' },
  ];

  // Find next uncompleted lesson
  const nextRecommendedLesson = useMemo(() => {
    for (const course of CHESS_COURSES) {
      for (const lesson of course.lessons) {
        if (!stats.lessonsCompleted.includes(lesson.id)) {
          return { course, lesson };
        }
      }
    }
    return { course: CHESS_COURSES[0], lesson: CHESS_COURSES[0].lessons[0] };
  }, [stats.lessonsCompleted]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1440px] mx-auto">
      {/* Clean Hero Header */}
      <section className="rounded-2xl bg-[#111624] border border-white/[0.08] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Rating: {stats.estimatedElo} ELO
            </span>
            <span className="flex items-center gap-1 text-amber-400 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              {stats.dailyStreak}d Streak
            </span>
            <span className="text-slate-400 font-mono">
              {stats.gamesPlayed} Games ({winRate}% Win Rate)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-100">
            Ready for your next chess session?
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Play against Stockfish, solve today’s multi-move tactical puzzle, or continue your structured lessons.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              onNavigate('puzzles', { category: 'daily', puzzleId: dailyPuzzle.id })
            }
            className="px-4 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-100 font-bold text-xs sm:text-sm border border-white/10 transition-colors flex items-center gap-2"
          >
            <Puzzle className="w-4 h-4 text-amber-400" />
            <span>Daily Puzzle</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('play')}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#070a12] font-extrabold text-xs sm:text-sm transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-[#070a12]" />
            <span>Play vs Computer</span>
          </button>
        </div>
      </section>

      {/* Main 12-Col Grid: Daily Puzzle + Quick Computer Sparring */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Interactive Daily Puzzle Showcase */}
        <div className="lg:col-span-7 rounded-2xl bg-[#111624] border border-white/[0.08] p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Daily Challenge
              </span>
              <h3 className="text-lg font-extrabold text-slate-100">
                {dailyPuzzle.title.replace(/^Daily Challenge:\s*/i, '')}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-[#171c2b] text-slate-300 border border-white/5">
                Elo {dailyPuzzle.rating}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {dailyPuzzle.playerColor === 'w' ? 'White to Move' : 'Black to Move'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            <div className="sm:col-span-6 flex justify-center">
              <div
                onClick={() =>
                  onNavigate('puzzles', { category: 'daily', puzzleId: dailyPuzzle.id })
                }
                className="w-full max-w-[280px] aspect-square cursor-pointer group relative"
              >
                <Chessboard
                  chess={dailyPuzzleChess}
                  orientation={dailyPuzzle.playerColor}
                  theme={settings.boardTheme}
                  showCoordinates={true}
                  showLegalMoves={false}
                  interactive={false}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors rounded-xl flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 rounded-xl bg-emerald-500 text-[#070a12] font-extrabold text-xs shadow-xl">
                    Solve Puzzle →
                  </span>
                </div>
              </div>
            </div>

            <div className="sm:col-span-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-[#171c2b] border border-white/[0.06] space-y-1.5">
                <div className="text-xs font-bold text-emerald-400">
                  Theme: {dailyPuzzle.theme.replace(/^Daily Challenge:\s*/i, '')}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  “{dailyPuzzle.hint}”
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-[#171c2b] border border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Tactics Rating
                  </div>
                  <div className="text-base font-mono font-bold text-slate-100 mt-0.5">
                    {stats.puzzleElo}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#171c2b] border border-white/[0.06]">
                  <div className="text-[10px] font-mono uppercase text-slate-400">
                    Solved
                  </div>
                  <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                    {stats.puzzlesSolved}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onNavigate('puzzles', { category: 'daily', puzzleId: dailyPuzzle.id })
                }
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#070a12] font-extrabold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-[#070a12]" />
                <span>Solve on Interactive Board</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Quick Play Computer & Next Lesson */}
        <div className="lg:col-span-5 space-y-5">
          {/* Play Computer Card */}
          <div className="rounded-2xl bg-[#111624] border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Play vs Computer</h3>
                  <p className="text-xs text-slate-400">Choose opponent strength (ELO)</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-400">
                {botOptions.find((b) => b.id === selectedBotDiff)?.elo} ELO
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {botOptions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBotDiff(b.id)}
                  className={`py-2 rounded-lg text-xs font-mono font-bold transition-colors ${
                    selectedBotDiff === b.id
                      ? 'bg-emerald-500 text-[#070a12]'
                      : 'bg-[#171c2b] text-slate-300 hover:text-white border border-white/5'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('play', { difficulty: selectedBotDiff })}
              className="w-full py-2.5 rounded-xl bg-[#171c2b] hover:bg-emerald-500 hover:text-[#070a12] text-slate-100 font-bold text-xs border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Match ({selectedBotDiff})</span>
            </button>
          </div>

          {/* Continue Learning Card */}
          <div className="rounded-2xl bg-[#111624] border border-white/[0.08] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Continue Learning</h3>
                  <p className="text-xs text-slate-400">
                    {stats.lessonsCompleted.length} of {totalLessons} lessons completed ({lessonsPercentage}%)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('learn', { subTab: 'openings' })}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Openings</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#171c2b] border border-white/[0.06] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                  Next Module • {nextRecommendedLesson.course.title}
                </div>
                <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
                  {nextRecommendedLesson.lesson.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {nextRecommendedLesson.lesson.description}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onNavigate('learn', {
                    courseId: nextRecommendedLesson.course.id,
                    lessonId: nextRecommendedLesson.lesson.id,
                  })
                }
                className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070a12] font-bold text-xs shrink-0 transition-colors"
              >
                Start →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Games Archive */}
      <div className="rounded-2xl bg-[#111624] border border-white/[0.08] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-100">Recent Games</h3>
            <p className="text-xs text-slate-400">
              Click any match to inspect move-by-move engine review
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            <span>View Full Profile & History</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.recentGames.slice(0, 4).map((game) => {
            const isWin = game.result === 'win';
            const isLoss = game.result === 'loss';
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => onNavigate('analysis', game)}
                className="group p-3.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] border border-white/[0.06] hover:border-emerald-500/30 transition-all flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs border shrink-0 ${
                      isWin
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isLoss
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {isWin ? 'W' : isLoss ? 'L' : 'D'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
                      vs. {game.opponent}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">
                      {game.reason} • {game.moves.length} moves
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-2">
                  <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                    {game.userAccuracy ?? 90}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
