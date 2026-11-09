import React from 'react';
import { Volume2, VolumeX, Menu, Play, Flame, Trophy } from 'lucide-react';
import { NavPage } from './Sidebar';
import { AppSettings, UserStats } from '../../types/chess';
import { soundManager } from '../../services/sound';

interface TopNavbarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage, context?: unknown) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  stats: UserStats;
  onToggleMobileMenu: () => void;
}

const PAGE_TITLES: Record<NavPage, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Home',
    subtitle: 'Play, solve daily tactics, and continue your lessons',
  },
  play: {
    title: 'Play vs Computer',
    subtitle: 'Practice against Stockfish with real-time coaching',
  },
  learn: {
    title: 'Learn Chess',
    subtitle: 'Interactive lessons, opening explorer, and coach sandbox',
  },
  practice: {
    title: 'Coach Sandbox',
    subtitle: 'Practice positions with Grandmaster Coach feedback',
  },
  openings: {
    title: 'Opening Explorer',
    subtitle: 'Study core chess openings and candidate continuations',
  },
  puzzles: {
    title: 'Tactical Puzzles',
    subtitle: 'Solve complete multi-move combinations and checkmates',
  },
  profile: {
    title: 'Player Profile',
    subtitle: 'Progress, game review archive, and board settings',
  },
  analysis: {
    title: 'Game Review',
    subtitle: 'Move-by-move accuracy and engine breakdown',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Board theme, coordinates, and audio preferences',
  },
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentPage,
  onNavigate,
  settings,
  onUpdateSettings,
  stats,
  onToggleMobileMenu,
}) => {
  const pageMeta = PAGE_TITLES[currentPage] || PAGE_TITLES.dashboard;

  const handleToggleSound = () => {
    const nextVal = !settings.soundEnabled;
    soundManager.setEnabled(nextVal);
    onUpdateSettings({ soundEnabled: nextVal });
  };

  return (
    <header className="h-14 bg-[#070a12]/90 backdrop-blur-md border-b border-white/[0.07] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Menu Button + Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#171c2b] transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0 flex items-baseline gap-3">
          <h1 className="font-bold text-slate-100 text-sm sm:text-base tracking-tight truncate">
            {pageMeta.title}
          </h1>
          <p className="hidden lg:block text-xs text-slate-400 truncate">
            {pageMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Rating, Streak, Sound Toggle, and Play CTA */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#111624] hover:bg-[#171c2b] border border-white/10 rounded-lg text-xs font-mono transition-colors"
          title="View Player Profile"
        >
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-slate-200">{stats.estimatedElo}</span>
        </button>

        <div
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-bold font-mono"
          title={`${stats.dailyStreak} Day Streak`}
        >
          <Flame className="w-3.5 h-3.5 fill-amber-400" />
          <span>{stats.dailyStreak}d</span>
        </div>

        <button
          type="button"
          onClick={handleToggleSound}
          className="p-1.5 rounded-lg bg-[#111624] hover:bg-[#171c2b] border border-white/10 text-slate-400 hover:text-white transition-colors"
          title={settings.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          aria-label={settings.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {settings.soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>

        {currentPage !== 'play' && (
          <button
            type="button"
            onClick={() => onNavigate('play')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070a12] text-xs font-bold transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-[#070a12]" />
            <span>Play</span>
          </button>
        )}
      </div>
    </header>
  );
};
