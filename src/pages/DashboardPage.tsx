import React from 'react';
import { NavPage } from '../components/Navigation/Sidebar';
import { UserStats, AppSettings } from '../types/chess';
import { CHESS_PUZZLES } from '../data/puzzles';
import { CHESS_COURSES } from '../data/lessons';
import {
  Play,
  Puzzle,
  GraduationCap,
  Trophy,
  Swords,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Award,
  Activity,
} from 'lucide-react';

interface DashboardPageProps {
  stats: UserStats;
  settings: AppSettings;
  onNavigate: (page: NavPage, context?: unknown) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ stats, onNavigate }) => {
  const dailyPuzzle = CHESS_PUZZLES.find((p) => p.category === 'daily') || CHESS_PUZZLES[0];
  const totalLessons = CHESS_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const lessonsPercentage = Math.round((stats.lessonsCompleted.length / totalLessons) * 100);

  const totalGames = stats.gamesPlayed;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
  const puzzleAccuracy =
    stats.puzzlesAttempted > 0
      ? Math.round((stats.puzzlesSolved / stats.puzzlesAttempted) * 100)
      : 100;

  const avgGameAccuracy = React.useMemo(() => {
    const gamesWithAcc = stats.recentGames.filter((g) => typeof g.userAccuracy === 'number');
    if (gamesWithAcc.length === 0) return 91;
    const sum = gamesWithAcc.reduce((acc, g) => acc + (g.userAccuracy || 0), 0);
    return Math.round(sum / gamesWithAcc.length);
  }, [stats.recentGames]);

  const eloPoints = stats.eloHistory || [
    { label: 'Start', rapid: 800, puzzle: 850, estimated: 820 },
    { label: 'Now', rapid: stats.rapidElo, puzzle: stats.puzzleElo, estimated: stats.estimatedElo },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-neutral-900 to-neutral-950 border border-emerald-800/40 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time AI Gameplay Coach Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back to <span className="text-emerald-400">AI Chess Academy</span>
            </h2>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Play against calibrated Stockfish opponents with live move-by-move AI coaching, solve tactical combinations, and track your real-time accuracy & Elo growth.
            </p>
          </div>

          {/* Quick Play CTA */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('play')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/60 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Play Stockfish</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('puzzles')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-sm border border-neutral-700 transition-all hover:scale-105 active:scale-95"
            >
              <Puzzle className="w-4 h-4 text-amber-400" />
              <span>Daily Puzzle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Elo */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated Elo</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.estimatedElo}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Rapid: {stats.rapidElo} • Blitz: {stats.blitzElo}</span>
          </div>
        </div>

        {/* Win Rate & Move Accuracy */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Win Rate & Accuracy</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {winRate}%
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              {avgGameAccuracy}% CAPS
            </span>
          </div>
          <div className="text-[11px] text-neutral-400">
            {stats.wins}W • {stats.losses}L • {stats.draws}D ({stats.gamesPlayed} matches)
          </div>
        </div>

        {/* Tactical Puzzles Solved */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Puzzles Solved</span>
            <Puzzle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2.5">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {stats.puzzlesSolved}
            </span>
            <span className="text-xs font-mono text-purple-300">{puzzleAccuracy}% acc</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            Puzzle Rating: <span className="text-purple-400 font-bold">{stats.puzzleElo}</span>
          </div>
        </div>

        {/* Course Progress */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-xs font-bold uppercase tracking-wider">Academy Progress</span>
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              {lessonsPercentage}%
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              ({stats.lessonsCompleted.length}/{totalLessons})
            </span>
          </div>
          <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${lessonsPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2-Column Section: Daily Challenge & Rating Progression Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Puzzle Card */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Puzzle className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-white text-sm">Puzzle of the Day</h3>
            </div>
            <span className="text-xs font-mono text-neutral-400">Rating {dailyPuzzle.rating}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-2">
            <div className="text-xs text-emerald-400 font-semibold">{dailyPuzzle.theme}</div>
            <p className="text-sm text-neutral-200 font-bold">{dailyPuzzle.title}</p>
            <p className="text-xs text-neutral-400">White to move and win material</p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('puzzles')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow"
          >
            <span>Solve Daily Puzzle</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Rating Progression Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Live Rating Evolution</h3>
                <p className="text-[11px] text-neutral-400">
                  Tracks your Composite Elo, Rapid Rating, and Tactical Puzzle Growth
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Composite ({stats.estimatedElo})
              </span>
              <span className="flex items-center gap-1 text-purple-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Puzzle ({stats.puzzleElo})
              </span>
            </div>
          </div>

          {/* SVG Rating Chart */}
          {(() => {
            const allVals = eloPoints.flatMap((p) => [p.estimated, p.puzzle, p.rapid]);
            const minVal = Math.min(...allVals) - 30;
            const maxVal = Math.max(...allVals) + 30;
            const range = Math.max(60, maxVal - minVal);
            const width = Math.max(1, eloPoints.length - 1) * 100;
            const toY = (v: number) => 88 - ((v - minVal) / range) * 74;

            const estPoints = eloPoints.map((pt, i) => `${i * 100},${toY(pt.estimated)}`).join(' ');
            const puzPoints = eloPoints.map((pt, i) => `${i * 100},${toY(pt.puzzle)}`).join(' ');
            const areaPoints = `0,95 ${estPoints} ${width},95`;

            return (
              <div className="relative h-36 w-full bg-neutral-950 rounded-xl border border-neutral-850 p-3 flex flex-col justify-between">
                <svg
                  className="w-full h-24 overflow-visible"
                  viewBox={`0 0 ${width} 100`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="dashEloGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPoints} fill="url(#dashEloGrad)" />
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    points={puzPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={estPoints}
                  />
                  {eloPoints.map((pt, i) => (
                    <circle
                      key={i}
                      cx={i * 100}
                      cy={toY(pt.estimated)}
                      r="4"
                      fill="#10b981"
                      stroke="#0a0a0a"
                      strokeWidth="1.5"
                    />
                  ))}
                </svg>

                <div className="flex justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-900">
                  {eloPoints.map((pt, idx) => (
                    <span key={idx}>
                      {pt.label} ({pt.estimated})
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Structured Courses Spotlight */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-white text-sm">Interactive Chess Curriculum</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('learn')}
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>View All {totalLessons} Lessons</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CHESS_COURSES.map((course) => {
            const completedCount = course.lessons.filter((l) =>
              stats.lessonsCompleted.includes(l.id)
            ).length;
            const isFinished = completedCount === course.lessons.length;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => onNavigate('learn')}
                className="text-left p-4 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-600/50 cursor-pointer transition-all hover:-translate-y-0.5 group"
              >
                <div className="text-2xl mb-2">{course.icon}</div>
                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                  {course.title}
                </h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{course.description}</p>

                <div className="mt-3 pt-3 border-t border-neutral-850 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 font-mono">
                    {completedCount} / {course.lessons.length} completed
                  </span>
                  {isFinished ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Complete
                    </span>
                  ) : (
                    <span className="text-emerald-400/80 font-mono">{course.levelElo} Elo</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Games Log */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Swords className="w-4 h-4 text-emerald-400" />
            <span>Recent Match History</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            View Full Analytics
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="text-[11px] text-neutral-500 uppercase border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">Opponent</th>
                <th className="py-2.5 px-3">Color</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Moves</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {stats.recentGames.slice(0, 5).map((game) => (
                <tr key={game.id} className="hover:bg-neutral-850/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">
                    {game.opponent} ({game.opponentElo})
                  </td>
                  <td className="py-3 px-3 uppercase text-[11px]">
                    {game.playerColor === 'w' ? '♔ White' : '♚ Black'}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        game.result === 'win'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : game.result === 'loss'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-neutral-700/40 text-neutral-300'
                      }`}
                    >
                      {game.result}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                    {game.userAccuracy ?? 90}%
                  </td>
                  <td className="py-3 px-3 font-mono">{game.moves.length}</td>
                  <td className="py-3 px-3 text-neutral-400">{game.date}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigate('analysis', game)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/40 font-semibold transition-colors"
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
