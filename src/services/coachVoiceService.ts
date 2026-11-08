import { VoiceCoachingSettings } from '../types/chess';

const VOICE_STORAGE_KEY = 'chess_academy_coach_voice_v1';

const DEFAULT_VOICE_SETTINGS: VoiceCoachingSettings = {
  enabled: false,
  muted: false,
  rate: 1.0,
};

export class CoachVoiceService {
  private settings: VoiceCoachingSettings;
  private lastSpokenText: string = '';

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): VoiceCoachingSettings {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_VOICE_SETTINGS };
    }
    try {
      const raw = window.localStorage.getItem(VOICE_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_VOICE_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        muted: Boolean(parsed.muted),
        rate: typeof parsed.rate === 'number' ? Math.max(0.75, Math.min(1.5, parsed.rate)) : 1.0,
      };
    } catch {
      return { ...DEFAULT_VOICE_SETTINGS };
    }
  }

  private saveSettings(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage quota errors
    }
  }

  public getSettings(): VoiceCoachingSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<VoiceCoachingSettings>): VoiceCoachingSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    if (!this.settings.enabled || this.settings.muted) {
      this.stop();
    }
    return this.getSettings();
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  /**
   * Speaks a coaching explanation asynchronously without blocking or delaying engine/UI execution.
   */
  public speak(text: string, priority: 'normal' | 'high' = 'normal'): boolean {
    if (!this.settings.enabled || this.settings.muted || !text.trim()) {
      return false;
    }

    const cleanText = text.replace(/[*_`~]/g, '').trim();
    if (cleanText === this.lastSpokenText && priority !== 'high') {
      return false;
    }
    this.lastSpokenText = cleanText;

    if (!this.isSupported()) {
      return false;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = this.settings.rate;
      utterance.pitch = 1.03;
      const voices = window.speechSynthesis.getVoices?.() || [];
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.toLowerCase().includes('elena') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('samantha') ||
            v.name.toLowerCase().includes('google'))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  public stop(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore
    }
  }
}

export const coachVoiceService = new CoachVoiceService();
