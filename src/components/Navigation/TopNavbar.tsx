import React from 'react';
import { Volume2, VolumeX, Menu, Sparkles, Play, Flame } from 'lucide-react';
import { NavPage } from './Sidebar';
import { AppSettings, UserStats } from '../../types/chess';
import { soundManager } from '../../services/sound';

interface TopNavbarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  stats: UserStats;
  onToggleMobileMenu: () => void;
}

const PAGE_TITLES: Record<NavPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your chess journey & training' },
  learn: { title: 'Learn Chess', subtitle: 'Master fundamental to grandmaster concepts' },
  practice: { title: 'Practice Board', subtitle: 'Interactive sandbox with engine evaluation' },
  play: { title: 'Play Computer', subtitle: 'Stockfish engine matches from 400 to 2200+ Elo' },
  puzzles: { title: 'Chess Puzzles', subtitle: 'Sharpen your calculation & tactical vision' },
  openings: { title: 'Opening Explorer', subtitle: 'Theoretical variations, plans, and opening traps' },
  analysis: { title: 'Game Analysis', subtitle: 'Deep engine post-game review & blunder detection' },
  profile: { title: 'Profile & Progress', subtitle: 'Track rating evolution, accuracy, and records' },
  settings: { title: 'Settings', subtitle: 'Customize board themes, audio, and engine depth' },
};

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentPage,
  onNavigate,
  settings,
  onUpdateSettings,
  stats,
  onToggleMobileMenu,
}) => {
  const pageMeta = PAGE_TITLES[currentPage] || { title: 'AI Chess Academy', subtitle: '' };

  const handleToggleSound = () => {
    const nextVal = !settings.soundEnabled;
    soundManager.setEnabled(nextVal);
    onUpdateSettings({ soundEnabled: nextVal });
  };

  return (
    <header className="h-16 bg-neutral-950 border-b border-neutral-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 select-none">
      {/* Left: Mobile Toggle + Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{pageMeta.title}</span>
          </h1>
          <p className="hidden sm:block text-[11px] text-neutral-400 truncate max-w-xs md:max-w-md">
            {pageMeta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Actions, Sound, Streak & Quick Play */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Daily Streak Indicator */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-bold"
          title={`${stats.dailyStreak} Day Practice Streak`}
        >
          <Flame className="w-3.5 h-3.5 fill-amber-400" />
          <span>{stats.dailyStreak}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={handleToggleSound}
          className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={settings.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
        >
          {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Quick CTA button */}
        {currentPage !== 'play' && (
          <button
            onClick={() => onNavigate('play')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950/50 transition-all hover:scale-105"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span className="hidden sm:inline">Play Match</span>
          </button>
        )}
      </div>
    </header>
  );
};
