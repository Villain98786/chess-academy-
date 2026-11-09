import React from 'react';
import {
  Home,
  Bot,
  GraduationCap,
  Puzzle,
  User,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { UserStats } from '../../types/chess';

export type NavPage =
  | 'dashboard'
  | 'learn'
  | 'practice'
  | 'play'
  | 'puzzles'
  | 'openings'
  | 'analysis'
  | 'profile'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage, context?: unknown) => void;
  stats: UserStats;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  stats,
  collapsed,
  onToggleCollapsed,
}) => {
  // Phase 3: Only 5 primary navigation destinations
  const navItems: {
    id: NavPage;
    label: string;
    icon: React.ReactNode;
    activeMatch: NavPage[];
  }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      activeMatch: ['dashboard'],
    },
    {
      id: 'play',
      label: 'Play',
      icon: <Bot className="w-5 h-5" />,
      activeMatch: ['play'],
    },
    {
      id: 'learn',
      label: 'Learn',
      icon: <GraduationCap className="w-5 h-5" />,
      activeMatch: ['learn', 'openings', 'practice'],
    },
    {
      id: 'puzzles',
      label: 'Puzzles',
      icon: <Puzzle className="w-5 h-5" />,
      activeMatch: ['puzzles'],
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: <User className="w-5 h-5" />,
      activeMatch: ['profile', 'analysis', 'settings'],
    },
  ];

  return (
    <aside
      aria-label="Primary Navigation"
      className={`relative flex flex-col bg-[#0a0e18] border-r border-white/[0.07] transition-all duration-200 z-20 select-none ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-white/[0.07]">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left overflow-hidden group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-[#070a12] shrink-0">
            <span className="text-xl leading-none font-black">♚</span>
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="font-extrabold text-slate-100 text-sm tracking-tight block leading-tight">
                Chess Academy
              </span>
              <span className="text-[11px] text-slate-400 font-medium block">
                Grandmaster Studio
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapsed}
          className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#171c2b] transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary 5-Item Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.activeMatch.includes(currentPage);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#171c2b]/70'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Compact Footer Summary */}
      <div className="p-3 border-t border-white/[0.07]">
        {!collapsed ? (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#111624] hover:bg-[#171c2b] border border-white/[0.06] transition-colors text-left"
          >
            <div>
              <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                Rating
              </div>
              <div className="text-sm font-bold text-slate-100 font-mono">
                {stats.estimatedElo} ELO
              </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold font-mono">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{stats.dailyStreak}d</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="w-full flex justify-center p-2 rounded-xl bg-[#111624] border border-white/[0.06] text-emerald-400 hover:bg-[#1f2638] text-xs font-mono font-bold"
            title={`${stats.estimatedElo} ELO`}
          >
            {stats.estimatedElo}
          </button>
        )}
      </div>
    </aside>
  );
};
