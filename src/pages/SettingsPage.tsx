import React from 'react';
import { AppSettings, BoardTheme, PieceTheme, UserStats } from '../types/chess';
import { soundManager } from '../services/sound';
import { StorageService } from '../services/storage';
import {
  Palette,
  Volume2,
  Cpu,
  Eye,
  Sliders,
  RotateCcw,
  Check,
} from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetStats: () => void;
}

const BOARD_THEMES: { id: BoardTheme; name: string; light: string; dark: string }[] = [
  { id: 'emerald', name: 'Tournament Emerald', light: '#ebecd0', dark: '#739552' },
  { id: 'wood', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'midnight', name: 'Midnight Slate', light: '#c4d1de', dark: '#4d607a' },
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Application Settings</h2>
        <p className="text-xs text-neutral-400">
          Customize your chessboard appearance, audio feedback, and engine preferences.
        </p>
      </div>

      {/* Board Theme Picker */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-400" />
          <span>Chessboard Theme</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BOARD_THEMES.map((theme) => {
            const isSelected = settings.boardTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleThemeChange(theme.id)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                  isSelected
                    ? 'bg-neutral-950 border-emerald-500 ring-2 ring-emerald-500/30'
                    : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* 2x2 Mini Board Preview */}
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-700 grid grid-cols-2 grid-rows-2 shadow-inner">
                  <div style={{ backgroundColor: theme.light }} />
                  <div style={{ backgroundColor: theme.dark }} />
                  <div style={{ backgroundColor: theme.dark }} />
                  <div style={{ backgroundColor: theme.light }} />
                </div>

                <div className="text-center">
                  <span className="text-xs font-bold text-white block">{theme.name}</span>
                  {isSelected && <span className="text-[10px] text-emerald-400 font-semibold">Active</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Preferences */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <span>Board Assistance & Visuals</span>
        </h3>

        <div className="space-y-3 divide-y divide-neutral-850">
          {/* Show Legal Moves */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-white">Show Legal Move Dots</div>
              <div className="text-[11px] text-neutral-400">Display circular indicators on valid move and capture targets</div>
            </div>
            <input
              type="checkbox"
              aria-label="Show Legal Move Dots"
              checked={settings.showLegalMoves}
              onChange={(e) => onUpdateSettings({ showLegalMoves: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Show Coordinates */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-xs font-semibold text-white">Show Board Coordinates</div>
              <div className="text-[11px] text-neutral-400">Display ranks 1-8 and files a-h along the board edge</div>
            </div>
            <input
              type="checkbox"
              aria-label="Show Board Coordinates"
              checked={settings.showCoordinates}
              onChange={(e) => onUpdateSettings({ showCoordinates: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Auto Promote to Queen */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-xs font-semibold text-white">Auto-Promote to Queen</div>
              <div className="text-[11px] text-neutral-400">Automatically crown pawns to Queens without showing the choice dialog</div>
            </div>
            <input
              type="checkbox"
              aria-label="Auto-Promote to Queen"
              checked={settings.autoQueen}
              onChange={(e) => onUpdateSettings({ autoQueen: e.target.checked })}
              className="w-4 h-4 accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Show Evaluation Bar */}
          <div className="flex items-center justify-between pt-3">
            <div>
              <div className="text-xs font-semibold text-white">Live Centipawn Evaluation Bar</div>
              <div className="text-[11px] text-neutral-400">Show real-time Stockfish advantage meter beside the board</div>
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
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-md space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>Audio Synthesizer Settings</span>
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Sound Effects Enabled</div>
              <div className="text-[11px] text-neutral-400">Play crisp wooden move, capture, check, and victory audio</div>
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
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <div className="flex justify-between text-xs text-neutral-400">
                <span>Sound Volume</span>
                <span className="font-mono text-emerald-400">{Math.round(settings.soundVolume * 100)}%</span>
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
      <div className="p-6 rounded-2xl bg-neutral-900 border border-rose-900/40 shadow-md flex items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Reset Academy Progress</h4>
          <p className="text-[11px] text-neutral-400 mt-0.5">
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
              className="px-3 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="px-4 py-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900 text-xs font-bold transition-colors"
          >
            Reset Stats
          </button>
        )}
      </div>
    </div>
  );
};
