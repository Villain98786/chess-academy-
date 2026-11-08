import React from 'react';
import { UserStats } from '../types/chess';
import { NavPage } from '../components/Navigation/Sidebar';
import { CHESS_COURSES } from '../data/lessons';
import {
  Trophy,
  Award,
  Swords,
  Flame,
  Puzzle,
  GraduationCap,
  Clock,
  TrendingUp,
  Star,
  Activity,
} from 'lucide-react';

interface ProfilePageProps {
  stats: UserStats;
  onNavigate: (page: NavPage, context?: unknown) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ stats, onNavigate }) => {
  const totalGames = stats.gamesPlayed;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
  const puzzleAccuracy =
    stats.puzzlesAttempted > 0
      ? Math.round((stats.puzzlesSolved / stats.puzzlesAttempted) * 100)
      : 100;

  const totalLessons = CHESS_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const lessonsPercentage = Math.round((stats.lessonsCompleted.length / totalLessons) * 100);

  // Aggregate move quality across all recent games for the player
  const moveQualityTotals = React.useMemo(() => {
    const counts = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      missed_win: 0,
      mistake: 0,
      blunder: 0,
    };
    let accSum = 0;
    let accCount = 0;

    for (const g of stats.recentGames) {
      if (typeof g.userAccuracy === 'number') {
        accSum += g.userAccuracy;
        accCount += 1;
      }
      for (const m of g.moves) {
        if (m.color === g.playerColor && m.classification) {
          counts[m.classification] = (counts[m.classification] || 0) + 1;
        }
      }
    }

    const avgAccuracy = accCount > 0 ? Math.round(accSum / accCount) : 91;
    return { counts, avgAccuracy };
  }, [stats.recentGames]);

  // Player Rank Title based on Estimated Elo
  let rankTitle = 'Novice Tactician';
  if (stats.estimatedElo >= 1800) rankTitle = 'National Master Candidate';
  else if (stats.estimatedElo >= 1400) rankTitle = 'Club Expert';
  else if (stats.estimatedElo >= 1100) rankTitle = 'Advanced Competitor';
  else if (stats.estimatedElo >= 800) rankTitle = 'Tactical Adept';

  const badges = [
    {
      id: 'first-win',
      name: 'First Blood',
      desc: 'Win your first game against Stockfish',
      icon: '⚔️',
      unlocked: stats.wins >= 1,
    },
    {
      id: 'puzzle-5',
      name: 'Tactician',
      desc: 'Solve 5 chess puzzles accurately',
      icon: '🧩',
      unlocked: stats.puzzlesSolved >= 5,
    },
    {
      id: 'lessons-3',
      name: 'Scholar',
      desc: 'Complete at least 3 structured lessons',
      icon: '🎓',
      unlocked: stats.lessonsCompleted.length >= 3,
    },
    {
      id: 'streak-3',
      name: 'On Fire',
      desc: 'Maintain a 3+ day training streak',
      icon: '🔥',
      unlocked: stats.dailyStreak >= 3,
    },
    {
      id: 'elo-1000',
      name: 'Four Figures',
      desc: 'Reach 1000+ estimated playing strength',
      icon: '🏆',
      unlocked: stats.estimatedElo >= 1000,
    },
    {
      id: 'sharp-eye',
      name: 'Precision Master',
      desc: 'Achieve 90%+ average CAPS move accuracy',
      icon: '🎯',
      unlocked: moveQualityTotals.avgAccuracy >= 90,
    },
  ];

  const eloPoints = stats.eloHistory || [
    { label: 'Day 1', rapid: 800, puzzle: 850, estimated: 820 },
    { label: 'Today', rapid: stats.rapidElo, puzzle: stats.puzzleElo, estimated: stats.estimatedElo },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Profile Header Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-950 border border-emerald-800/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-1 flex items-center justify-center text-4xl shadow-lg shadow-emerald-950/60">
            <span>♟️</span>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <Star className="w-3 h-3 fill-emerald-400" />
              <span>{rankTitle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">Academy Player Profile</h2>
            <p className="text-xs text-neutral-400">
              Active Date: {stats.lastActiveDate} • Average Move Accuracy: {moveQualityTotals.avgAccuracy}%
            </p>
          </div>
        </div>

        {/* Streaks & Time */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <Flame className="w-6 h-6 text-amber-400 fill-amber-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Daily Streak</div>
              <div className="text-lg font-black text-white font-mono">{stats.dailyStreak} Days</div>
            </div>
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <Clock className="w-6 h-6 text-emerald-400" />
            <div>
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Practice Time</div>
              <div className="text-lg font-black text-white font-mono">{stats.practiceTimeMinutes} mins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Ratings Evolution Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Overall Strength</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono my-2">{stats.estimatedElo}</div>
          <div className="text-[11px] text-emerald-400 font-semibold">
            Avg CAPS Accuracy: {moveQualityTotals.avgAccuracy}%
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Rapid & Blitz</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono my-2">{stats.rapidElo}</div>
          <div className="text-[11px] text-neutral-400">Blitz Rating: {stats.blitzElo} Elo</div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Puzzle Rating</span>
            <Puzzle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono my-2">{stats.puzzleElo}</div>
          <div className="text-[11px] text-neutral-400">
            {stats.puzzlesSolved}/{stats.puzzlesAttempted} solved ({puzzleAccuracy}%)
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md">
          <div className="flex justify-between items-center text-neutral-400 text-xs font-bold uppercase tracking-wider">
            <span>Lessons Completed</span>
            <GraduationCap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono my-2">
            {stats.lessonsCompleted.length} / {totalLessons}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold">{lessonsPercentage}% of curriculum</div>
        </div>
      </div>

      {/* Rating Evolution Graph & Move Quality Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Progression Chart */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Elo Rating Trajectory</span>
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-emerald-400 font-semibold">● Composite</span>
              <span className="text-blue-400 font-semibold">● Rapid</span>
              <span className="text-purple-400 font-semibold">● Puzzle</span>
            </div>
          </div>

          {(() => {
            const allVals = eloPoints.flatMap((p) => [p.estimated, p.puzzle, p.rapid]);
            const minVal = Math.min(...allVals) - 30;
            const maxVal = Math.max(...allVals) + 30;
            const range = Math.max(60, maxVal - minVal);
            const width = Math.max(1, eloPoints.length - 1) * 100;
            const toY = (v: number) => 88 - ((v - minVal) / range) * 74;

            const rapidPoints = eloPoints.map((pt, i) => `${i * 100},${toY(pt.rapid)}`).join(' ');
            const puzPoints = eloPoints.map((pt, i) => `${i * 100},${toY(pt.puzzle)}`).join(' ');
            const estPoints = eloPoints.map((pt, i) => `${i * 100},${toY(pt.estimated)}`).join(' ');
            const areaPoints = `0,95 ${estPoints} ${width},95`;

            return (
              <div className="relative h-44 w-full bg-neutral-950 rounded-xl border border-neutral-850 p-3 flex flex-col justify-between">
                <svg
                  className="w-full h-32 overflow-visible"
                  viewBox={`0 0 ${width} 100`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="profEloGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon points={areaPoints} fill="url(#profEloGrad)" />
                  <polyline
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="2"
                    points={rapidPoints}
                  />
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="2"
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

        {/* Aggregate Move Quality Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Move Precision & Classification Totals</span>
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {moveQualityTotals.avgAccuracy}% Overall Accuracy
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 rounded-xl bg-neutral-950 border border-cyan-500/30">
              <span className="text-[11px] font-extrabold text-cyan-300">!! Brilliant</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {moveQualityTotals.counts.brilliant}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/30">
              <span className="text-[11px] font-extrabold text-emerald-400">★ Best Move</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {moveQualityTotals.counts.best}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-green-500/30">
              <span className="text-[11px] font-extrabold text-green-400">✓ Good Move</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {moveQualityTotals.counts.good}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-amber-500/30">
              <span className="text-[11px] font-extrabold text-amber-400">?! Inaccuracy</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {moveQualityTotals.counts.inaccuracy}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-orange-500/30">
              <span className="text-[11px] font-extrabold text-orange-400">? Mistake</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {moveQualityTotals.counts.mistake}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-950 border border-rose-500/30">
              <span className="text-[11px] font-extrabold text-rose-400">?? Blunder</span>
              <div className="text-xl font-black text-white font-mono mt-1">
                {moveQualityTotals.counts.blunder}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record and Achievements 2-Col Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Match Statistics & Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-emerald-400" />
            <span>Match Record & Win Rate</span>
          </h3>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-900/30">
              <span className="text-[10px] uppercase font-bold text-emerald-400">Victories</span>
              <div className="text-2xl font-black text-white font-mono mt-1">{stats.wins}</div>
              <span className="text-[10px] text-neutral-400">{winRate}% win rate</span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-rose-900/30">
              <span className="text-[10px] uppercase font-bold text-rose-400">Defeats</span>
              <div className="text-2xl font-black text-white font-mono mt-1">{stats.losses}</div>
              <span className="text-[10px] text-neutral-400">
                {totalGames > 0 ? Math.round((stats.losses / totalGames) * 100) : 0}% loss rate
              </span>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-[10px] uppercase font-bold text-neutral-400">Draws</span>
              <div className="text-2xl font-black text-white font-mono mt-1">{stats.draws}</div>
              <span className="text-[10px] text-neutral-400">
                {totalGames > 0 ? Math.round((stats.draws / totalGames) * 100) : 0}% draw rate
              </span>
            </div>
          </div>

          {totalGames > 0 && (
            <div className="space-y-1 pt-2">
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-950">
                <div
                  style={{ width: `${(stats.wins / totalGames) * 100}%` }}
                  className="bg-emerald-500 h-full"
                />
                <div
                  style={{ width: `${(stats.draws / totalGames) * 100}%` }}
                  className="bg-neutral-500 h-full"
                />
                <div
                  style={{ width: `${(stats.losses / totalGames) * 100}%` }}
                  className="bg-rose-500 h-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Achievement Badges */}
        <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Academy Achievement Badges</span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              {badges.filter((b) => b.unlocked).length} / {badges.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                  badge.unlocked
                    ? 'bg-neutral-950 border-emerald-500/40 text-white shadow-sm'
                    : 'bg-neutral-950/40 border-neutral-850 text-neutral-500 opacity-50'
                }`}
              >
                <span className="text-2xl mb-1">{badge.icon}</span>
                <span className="text-xs font-bold truncate max-w-full">{badge.name}</span>
                <span className="text-[10px] text-neutral-400 mt-0.5 leading-tight line-clamp-2">
                  {badge.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complete Match Log */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Complete Match History</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="text-[11px] text-neutral-500 uppercase border-b border-neutral-800">
              <tr>
                <th className="py-2.5 px-3">Opponent</th>
                <th className="py-2.5 px-3">Color</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3">Accuracy</th>
                <th className="py-2.5 px-3">Reason</th>
                <th className="py-2.5 px-3">Moves</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-850">
              {stats.recentGames.map((game) => (
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
                  <td className="py-3 px-3 text-neutral-400">{game.reason}</td>
                  <td className="py-3 px-3 font-mono">{game.moves.length}</td>
                  <td className="py-3 px-3 text-neutral-400">{game.date}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigate('analysis', game)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/70 hover:bg-emerald-800/60 text-emerald-300 border border-emerald-700/40 font-semibold transition-colors"
                    >
                      Deep Analysis
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
