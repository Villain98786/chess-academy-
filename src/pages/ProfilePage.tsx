import React, { useState, useMemo, useEffect } from 'react';
import { AppSettings, GameRecord, UserStats } from '../types/chess';
import { NavPage } from '../components/Navigation/Sidebar';
import { CHESS_COURSES } from '../data/lessons';
import { AnalysisPage } from './AnalysisPage';
import { SettingsPage } from './SettingsPage';
import {
  Trophy,
  Award,
  Flame,
  Puzzle,
  GraduationCap,
  Clock,
  TrendingUp,
  Activity,
  LineChart,
  Settings,
  User,
} from 'lucide-react';

interface ProfilePageProps {
  stats: UserStats;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetStats: () => void;
  onNavigate: (page: NavPage, context?: unknown) => void;
  initialContext?: {
    subTab?: 'overview' | 'analysis' | 'settings';
    game?: GameRecord;
  } | null;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  stats,
  settings,
  onUpdateSettings,
  onResetStats,
  onNavigate,
  initialContext,
}) => {
  const [subTab, setSubTab] = useState<'overview' | 'analysis' | 'settings'>(
    initialContext?.subTab || 'overview'
  );
  const [selectedGameForReview, setSelectedGameForReview] = useState<GameRecord | undefined>(
    initialContext?.game
  );
  const [gameFilter, setGameFilter] = useState<'all' | 'win' | 'loss' | 'draw'>('all');

  useEffect(() => {
    if (initialContext?.subTab) {
      setSubTab(initialContext.subTab);
    }
    if (initialContext?.game) {
      setSelectedGameForReview(initialContext.game);
      setSubTab('analysis');
    }
  }, [initialContext]);

  const totalGames = stats.gamesPlayed;
  const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
  const puzzleAccuracy =
    stats.puzzlesAttempted > 0
      ? Math.round((stats.puzzlesSolved / stats.puzzlesAttempted) * 100)
      : 100;

  const totalLessons = CHESS_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const lessonsPercentage = Math.round((stats.lessonsCompleted.length / totalLessons) * 100);

  const moveQualityTotals = useMemo(() => {
    let accSum = 0;
    let accCount = 0;

    for (const g of stats.recentGames) {
      if (typeof g.userAccuracy === 'number') {
        accSum += g.userAccuracy;
        accCount += 1;
      }
    }

    const avgAccuracy = accCount > 0 ? Math.round(accSum / accCount) : 91;
    return { avgAccuracy };
  }, [stats.recentGames]);

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
      desc: 'Achieve 90%+ average move accuracy',
      icon: '🎯',
      unlocked: moveQualityTotals.avgAccuracy >= 90,
    },
  ];

  const eloPoints = stats.eloHistory || [
    { label: 'Day 1', rapid: 800, puzzle: 850, estimated: 820 },
    { label: 'Today', rapid: stats.rapidElo, puzzle: stats.puzzleElo, estimated: stats.estimatedElo },
  ];

  const filteredGames = useMemo(() => {
    if (gameFilter === 'all') return stats.recentGames;
    return stats.recentGames.filter((g) => g.result === gameFilter);
  }, [stats.recentGames, gameFilter]);

  return (
    <div className="space-y-4">
      {/* Top Sub-Navigation Switcher: Overview & History | Game Review | Settings */}
      <div className="px-4 sm:px-6 pt-4 max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#111624] border border-white/10">
          <button
            type="button"
            onClick={() => setSubTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'overview'
                ? 'bg-emerald-500 text-[#070a12]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Overview & History</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('analysis')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'analysis'
                ? 'bg-emerald-500 text-[#070a12]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Game Review</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'settings'
                ? 'bg-emerald-500 text-[#070a12]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {subTab === 'analysis' && (
        <AnalysisPage
          settings={settings}
          stats={stats}
          initialGame={selectedGameForReview}
          onNavigate={onNavigate}
        />
      )}

      {subTab === 'settings' && (
        <SettingsPage
          settings={settings}
          onUpdateSettings={onUpdateSettings}
          onResetStats={onResetStats}
        />
      )}

      {subTab === 'overview' && (
        <div className="px-4 sm:px-6 pb-6 space-y-6 max-w-[1520px] mx-auto">
          {/* Player Summary Header */}
          <section className="rounded-2xl bg-[#111624] border border-white/[0.08] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
                ♔
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  {rankTitle}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100">
                  Player Profile & Statistics
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Practice Time: {stats.practiceTimeMinutes} mins • Avg Accuracy:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {moveQualityTotals.avgAccuracy}%
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-2 rounded-xl bg-[#171c2b] border border-white/[0.07] flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Streak</div>
                  <div className="text-sm font-bold text-slate-100 font-mono">
                    {stats.dailyStreak} Days
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubTab('settings')}
                className="px-4 py-2.5 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 border border-white/10 text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4 text-emerald-400" />
                <span>Board & Audio Settings</span>
              </button>
            </div>
          </section>

          {/* 4-Card Core KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#111624] border border-white/[0.08]">
              <div className="flex justify-between items-center text-slate-400 text-xs font-mono uppercase">
                <span>Overall Rating</span>
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono my-1">
                {stats.estimatedElo}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Rapid {stats.rapidElo} • Blitz {stats.blitzElo}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-white/[0.08]">
              <div className="flex justify-between items-center text-slate-400 text-xs font-mono uppercase">
                <span>Tactics Rating</span>
                <Puzzle className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400 font-mono my-1">
                {stats.puzzleElo}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {stats.puzzlesSolved} solved ({puzzleAccuracy}%)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-white/[0.08]">
              <div className="flex justify-between items-center text-slate-400 text-xs font-mono uppercase">
                <span>Lessons</span>
                <GraduationCap className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono my-1">
                {stats.lessonsCompleted.length}/{totalLessons}
              </div>
              <div className="text-xs text-emerald-400 font-mono">
                {lessonsPercentage}% Complete
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#111624] border border-white/[0.08]">
              <div className="flex justify-between items-center text-slate-400 text-xs font-mono uppercase">
                <span>Win / Draw / Loss</span>
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-slate-100 font-mono my-1">
                {winRate}%
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {stats.wins}W • {stats.draws}D • {stats.losses}L
              </div>
            </div>
          </div>

          {/* Rating Progression & Achievements Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#111624] border border-white/[0.08] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Rating Progression</span>
                </h3>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">● Rating</span>
                  <span className="text-amber-400 font-bold">● Tactics</span>
                </div>
              </div>

              {(() => {
                const allVals = eloPoints.flatMap((p) => [p.estimated, p.puzzle, p.rapid]);
                const minVal = Math.min(...allVals) - 30;
                const maxVal = Math.max(...allVals) + 30;
                const range = Math.max(60, maxVal - minVal);
                const width = Math.max(1, eloPoints.length - 1) * 100;
                const toY = (v: number) => 88 - ((v - minVal) / range) * 74;

                const puzPoints = eloPoints
                  .map((pt, i) => `${i * 100},${toY(pt.puzzle)}`)
                  .join(' ');
                const estPoints = eloPoints
                  .map((pt, i) => `${i * 100},${toY(pt.estimated)}`)
                  .join(' ');
                const areaPoints = `0,95 ${estPoints} ${width},95`;

                return (
                  <div className="relative h-44 w-full bg-[#0a0e18] rounded-xl border border-white/[0.06] p-4 flex flex-col justify-between">
                    <svg
                      className="w-full h-28 overflow-visible"
                      viewBox={`0 0 ${width} 100`}
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="profEloGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <polygon points={areaPoints} fill="url(#profEloGrad)" />
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        points={puzPoints}
                      />
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3"
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
                          stroke="#070a12"
                          strokeWidth="2"
                        />
                      ))}
                    </svg>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-2 border-t border-white/[0.06]">
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

            {/* Achievements Showcase */}
            <div className="lg:col-span-5 bg-[#111624] border border-white/[0.08] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Milestones</span>
                </h3>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {badges.filter((b) => b.unlocked).length} / {badges.length}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center ${
                      badge.unlocked
                        ? 'bg-[#171c2b] border-emerald-500/40 text-white'
                        : 'bg-[#0a0e18]/60 border-white/[0.05] text-slate-500 opacity-55'
                    }`}
                  >
                    <span className="text-xl mb-1">{badge.icon}</span>
                    <span className="text-xs font-bold truncate max-w-full">{badge.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                      {badge.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Complete Filterable Match History */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#111624] border border-white/[0.08] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Match History & Game Review</span>
              </h3>

              <div className="flex items-center gap-1 bg-[#171c2b] p-1 rounded-xl border border-white/[0.06]">
                {(['all', 'win', 'loss', 'draw'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setGameFilter(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
                      gameFilter === tab
                        ? 'bg-emerald-500 text-[#070a12]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab === 'loss' ? 'Losses' : `${tab}s`}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[11px] text-slate-400 font-mono uppercase border-b border-white/[0.08]">
                  <tr>
                    <th className="py-3 px-3">Opponent</th>
                    <th className="py-3 px-3">Color</th>
                    <th className="py-3 px-3">Result</th>
                    <th className="py-3 px-3">Accuracy</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Moves</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {filteredGames.map((game) => (
                    <tr key={game.id} className="hover:bg-[#171c2b]/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-100">
                        {game.opponent} ({game.opponentElo})
                      </td>
                      <td className="py-3 px-3 uppercase text-[11px] font-mono">
                        {game.playerColor === 'w' ? '♔ White' : '♚ Black'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            game.result === 'win'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : game.result === 'loss'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {game.result}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        {game.userAccuracy ?? 90}%
                      </td>
                      <td className="py-3 px-3 text-slate-400">{game.reason}</td>
                      <td className="py-3 px-3 font-mono">{game.moves.length}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGameForReview(game);
                            setSubTab('analysis');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 hover:text-[#070a12] text-emerald-300 border border-emerald-500/30 font-bold transition-colors"
                        >
                          Review Game
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
