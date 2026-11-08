import React, { useState, useEffect } from 'react';
import { NavPage, Sidebar } from './components/Navigation/Sidebar';
import { TopNavbar } from './components/Navigation/TopNavbar';
import { DashboardPage } from './pages/DashboardPage';
import { LearnPage } from './pages/LearnPage';
import { PracticePage } from './pages/PracticePage';
import { PlayComputerPage } from './pages/PlayComputerPage';
import { PuzzlesPage } from './pages/PuzzlesPage';
import { OpeningsPage } from './pages/OpeningsPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AppSettings, UserStats, GameRecord } from './types/chess';
import { StorageService } from './services/storage';
import { soundManager } from './services/sound';

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

  const handleNavigate = (page: NavPage, context?: unknown) => {
    setCurrentPage(page);
    setPageContext(context || null);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-neutral-100 flex font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          stats={stats}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-neutral-950 z-10 shadow-2xl">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          stats={stats}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {currentPage === 'dashboard' && (
            <DashboardPage stats={stats} settings={settings} onNavigate={handleNavigate} />
          )}

          {currentPage === 'learn' && (
            <LearnPage
              settings={settings}
              stats={stats}
              onUpdateStats={handleUpdateStats}
              initialContext={pageContext as { courseId?: 'beginner' | 'intermediate' | 'advanced' | 'master'; lessonId?: string } | null}
            />
          )}

          {currentPage === 'practice' && (
            <PracticePage settings={settings} />
          )}

          {currentPage === 'play' && (
            <PlayComputerPage
              settings={settings}
              stats={stats}
              onUpdateStats={handleUpdateStats}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'puzzles' && (
            <PuzzlesPage
              settings={settings}
              stats={stats}
              onUpdateStats={handleUpdateStats}
            />
          )}

          {currentPage === 'openings' && (
            <OpeningsPage settings={settings} />
          )}

          {currentPage === 'analysis' && (
            <AnalysisPage
              settings={settings}
              stats={stats}
              initialGame={pageContext as GameRecord | undefined}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'profile' && (
            <ProfilePage stats={stats} onNavigate={handleNavigate} />
          )}

          {currentPage === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onResetStats={handleResetStats}
            />
          )}
        </main>
      </div>
    </div>
  );
}
