import React from 'react';
import { AppSettings, BoardTheme } from '../types/chess';
import { soundManager } from '../services/sound';
import { Palette, Volume2, Eye } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetStats: () => void;
}

const BOARD_THEMES: { id: BoardTheme; name: string; light: string; dark: string }[] = [
  { id: 'grandmaster', name: 'Grandmaster Slate', light: '#2d3548', dark: '#1a202e' },
  { id: 'emerald', name: 'Tournament Emerald', light: '#ebecd0', dark: '#739552' },
  { id: 'wood', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'midnight', name: 'Midnight Navy', light: '#2d3548', dark: '#1a202e' },
  { id: 'cyber', name: 'Cyber Neon', light: '#a2e2c4', dark: '#1b4d3e' },
];

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onResetStats,
}) => {
  const [confirmReset, setConfirmReset] = React.useState(false);

  const handleThemeChange = (theme: BoardTheme) => {
    onUpdateSettings({ boardTheme: theme });
  };

  const handleSoundToggle = (enabled: boolean) => {
    soundManager.setEnabled(enabled);
    onUpdateSettings({ soundEnabled: enabled });
  };

  const handleVolumeChange = (vol: number) => {
    soundManager.setVolume(vol);
    onUpdateSettings({ soundVolume: vol });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
          Studio Configuration
        </span>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
          Grandmaster Studio Settings
        </h2>
        <p className="text-xs text-slate-400">
          Customize your chessboard vinyl theme, audio synthesizer, and Stockfish NNUE telemetry overlays.
        </p>
      </div>

      {/* Board Theme Picker */}
      <div className="p-6 rounded-2xl bg-[#111624] border border-white/[0.08] shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-400" />
          <span>Chessboard Surface Theme</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {BOARD_THEMES.map((theme) => {
            const isSelected = settings.boardTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeChange(theme.id)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-[#171c2b] border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-[#0a0e18] border-white/[0.07] hover:border-white/20'
                }`}
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 grid grid-cols-2 grid-rows-2 shadow-inner">
                  <div style={{ backgroundColor: theme.light }} />
                  <div style={{ backgroundColor: theme.dark }} />
                  <div style={{ backgroundColor: theme.dark }} />
                  <div style={{ backgroundColor: theme.light }} />
                </div>

                <div className="text-center">
                  <span className="text-xs font-bold text-slate-100 block">{theme.name}</span>
                  {isSelected && (
                    <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                      Active
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Preferences */}
      <div className="p-6 rounded-2xl bg-[#111624] border border-white/[0.08] shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Board Assistance & Visuals</span>
        </h3>

        <div className="space-y-3 divide-y divide-white/[0.06]">
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-slate-100">Show Legal Move Dots</div>
              <div className="text-[11px] text-slate-400">
                Display circular indicators on valid move and capture targets
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Show Legal Move Dots"
              checked={settings.showLegalMoves}
              onChange={(e) => onUpdateSettings({ showLegalMoves: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-xs font-semibold text-slate-100">Show Board Coordinates</div>
              <div className="text-[11px] text-slate-400">
                Display ranks 1-8 and files a-h along the board edge
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Show Board Coordinates"
              checked={settings.showCoordinates}
              onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-xs font-semibold text-slate-100">Auto-Promote to Queen</div>
              <div className="text-[11px] text-slate-400">
                Automatically crown pawns to Queens without showing the choice dialog
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Auto-Promote to Queen"
              checked={settings.autoQueen}
              onChange={(e) => onUpdateSettings({ autoQueen: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-xs font-semibold text-slate-100">
                Live Centipawn Evaluation Bar
              </div>
              <div className="text-[11px] text-slate-400">
                Show real-time Stockfish 16.1 NNUE advantage gauge beside the board
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Live Centipawn Evaluation Bar"
              checked={settings.showEvalBar}
              onChange={(e) => onUpdateSettings({ showEvalBar: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Audio Settings */}
      <div className="p-6 rounded-2xl bg-[#111624] border border-white/[0.08] shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>Audio Synthesizer Settings</span>
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-100">Sound Effects Enabled</div>
              <div className="text-[11px] text-slate-400">
                Play crisp wooden move, capture, check, and victory audio
              </div>
            </div>
            <input
              type="checkbox"
              aria-label="Sound Effects Enabled"
              checked={settings.soundEnabled}
              onChange={(e) => handleSoundToggle(e.target.checked)}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {settings.soundEnabled && (
            <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Sound Volume</span>
                <span className="font-mono text-emerald-400">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                aria-label="Sound Volume"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Reset Progress Section */}
      <div className="p-6 rounded-2xl bg-[#111624] border border-rose-500/30 shadow-xl flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
            Reset Academy Progress
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Restore initial academy ratings, sample games, and curriculum status.
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResetStats();
                setConfirmReset(false);
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
            >
              Confirm Reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="px-3 py-2 rounded-xl bg-[#171c2b] text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 text-xs font-bold transition-colors"
          >
            Reset Stats
          </button>
        )}
      </div>
    </div>
  );
};
