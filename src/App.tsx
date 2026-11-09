import React, { useState, useEffect } from 'react';
import { NavPage, Sidebar } from './components/Navigation/Sidebar';
import { TopNavbar } from './components/Navigation/TopNavbar';
import { DashboardPage } from './pages/DashboardPage';
import { LearnPage } from './pages/LearnPage';
import { PlayComputerPage } from './pages/PlayComputerPage';
import { PuzzlesPage } from './pages/PuzzlesPage';
import { ProfilePage } from './pages/ProfilePage';
import { AppSettings, UserStats, GameRecord, CourseLevelId } from './types/chess';
import { StorageService } from './services/storage';
import { soundManager } from './services/sound';
import { Home, Bot, GraduationCap, Puzzle, User } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [pageContext, setPageContext] = useState<unknown>(null);
  const [stats, setStats] = useState<UserStats>(() => StorageService.getStats());
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync initial sound manager settings and track live practice minutes
  useEffect(() => {
    soundManager.setEnabled(settings.soundEnabled);
    soundManager.setVolume(settings.soundVolume);

    const practiceTimer = setInterval(() => {
      const updated = StorageService.addPracticeTime(1);
      setStats(updated);
    }, 60000);

    return () => clearInterval(practiceTimer);
  }, []);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleUpdateStats = (newStats: UserStats) => {
    setStats(newStats);
    StorageService.saveStats(newStats);
  };

  const handleResetStats = () => {
    const fresh = StorageService.resetToFresh();
    setStats(fresh);
  };

  // Phase 3: Route all navigation cleanly into the 5 primary screens while preserving sub-features
  const handleNavigate = (page: NavPage, context?: unknown) => {
    if (page === 'openings') {
      setCurrentPage('learn');
      setPageContext({ subTab: 'openings' });
    } else if (page === 'practice') {
      setCurrentPage('learn');
      setPageContext({ subTab: 'practice' });
    } else if (page === 'analysis') {
      setCurrentPage('profile');
      setPageContext({
        subTab: 'analysis',
        game: context as GameRecord | undefined,
      });
    } else if (page === 'settings') {
      setCurrentPage('profile');
      setPageContext({ subTab: 'settings' });
    } else {
      setCurrentPage(page);
      setPageContext(context || null);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Phase 3: Only 5 primary navigation destinations on Mobile Bottom Bar
  const mobileBottomNavItems: { id: NavPage; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { id: 'play', label: 'Play', icon: <Bot className="w-5 h-5" /> },
    { id: 'learn', label: 'Learn', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'puzzles', label: 'Puzzles', icon: <Puzzle className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200 overflow-x-hidden">
      {/* Desktop & Tablet Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          stats={stats}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#0a0e18] z-10 shadow-2xl">
            <Sidebar
              currentPage={currentPage}
              onNavigate={handleNavigate}
              stats={stats}
              collapsed={false}
              onToggleCollapsed={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <TopNavbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          stats={stats}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0 bg-studio-grid">
          {currentPage === 'dashboard' && (
            <DashboardPage stats={stats} settings={settings} onNavigate={handleNavigate} />
          )}

          {currentPage === 'learn' && (
            <LearnPage
              settings={settings}
              stats={stats}
              onUpdateStats={handleUpdateStats}
              onNavigate={handleNavigate}
              initialContext={
                pageContext as {
                  subTab?: 'lessons' | 'openings' | 'practice';
                  courseId?: CourseLevelId;
                  lessonId?: string;
                } | null
              }
            />
          )}

          {currentPage === 'play' && (
            <PlayComputerPage
              settings={settings}
              stats={stats}
              onUpdateStats={handleUpdateStats}
              onNavigate={handleNavigate}
              initialDifficulty={
                (pageContext as { difficulty?: string } | null)?.difficulty as any
              }
            />
          )}

          {currentPage === 'puzzles' && (
            <PuzzlesPage
              settings={settings}
              stats={stats}
              onUpdateStats={handleUpdateStats}
              initialContext={
                pageContext as { category?: string; puzzleId?: string } | null
              }
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage
              stats={stats}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetStats={handleResetStats}
              onNavigate={handleNavigate}
              initialContext={
                pageContext as {
                  subTab?: 'overview' | 'analysis' | 'settings';
                  game?: GameRecord;
                } | null
              }
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (< 768px) — 5 Primary Destinations */}
        <nav
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#0a0e18]/95 backdrop-blur-xl border-t border-white/10 z-40 grid grid-cols-5 items-center px-1 select-none"
        >
          {mobileBottomNavItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.icon}
                <span className="text-[11px] mt-0.5 tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
