import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Swords,
  Bot,
  Puzzle,
  BookOpen,
  LineChart,
  User,
  Settings,
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
  onNavigate: (page: NavPage) => void;
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
  const navItems: { id: NavPage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn Chess', icon: <GraduationCap className="w-5 h-5" />, badge: `${stats.lessonsCompleted.length}/23` },
    { id: 'practice', label: 'Practice', icon: <Swords className="w-5 h-5" /> },
    { id: 'play', label: 'Play Computer', icon: <Bot className="w-5 h-5" /> },
    { id: 'puzzles', label: 'Puzzles', icon: <Puzzle className="w-5 h-5" />, badge: `${stats.puzzlesSolved}` },
    { id: 'openings', label: 'Openings', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'analysis', label: 'Game Analysis', icon: <LineChart className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile & Progress', icon: <User className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`relative flex flex-col bg-neutral-950 border-r border-neutral-800 transition-all duration-300 z-20 ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800/80">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left overflow-hidden group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0 group-hover:scale-105 transition-transform">
            <span className="text-2xl leading-none">♚</span>
          </div>
          {!collapsed && (
            <div className="truncate">
              <span className="font-extrabold text-white text-base tracking-tight block">AI CHESS</span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block">ACADEMY</span>
            </div>
          )}
        </button>

        <button
          onClick={onToggleCollapsed}
          className="hidden md:flex p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* User Mini Stat Pill */}
      {!collapsed && (
        <div className="mx-3 mt-3 p-3 bg-neutral-900/90 rounded-xl border border-neutral-800/80 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] text-neutral-400">Estimated Elo</div>
            <div className="text-lg font-black text-emerald-400 font-mono leading-none mt-0.5">
              {stats.estimatedElo}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs font-bold">
            <Flame className="w-4 h-4 fill-amber-400 animate-pulse" />
            <span>{stats.dailyStreak}d</span>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              } ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className={`shrink-0 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-emerald-400'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-emerald-800 text-emerald-100'
                          : 'bg-neutral-800 text-neutral-400 group-hover:text-neutral-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Quick Coach Prompt */}
      {!collapsed && (
        <div className="p-3 m-3 bg-gradient-to-br from-emerald-950/40 to-neutral-900 border border-emerald-900/30 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
            <span>✨</span> GM Elena Online
          </div>
          <p className="text-[11px] text-neutral-400 leading-tight">
            Ask for hints or move analysis anytime during practice!
          </p>
        </div>
      )}
    </aside>
  );
};
