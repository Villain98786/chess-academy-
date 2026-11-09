import React, { useState, useEffect } from 'react';
import { Square } from 'chess.js';
import {
  CoachExplanation,
  CoachHintLevel,
  CoachState,
  CourseLevelId,
  VoiceCoachingSettings,
} from '../../types/chess';
import { getClassificationMeta } from '../../services/analytics';
import { coachVoiceService } from '../../services/coachVoiceService';
import { grandmasterCoach } from '../../services/grandmasterCoachService';
import { chessEngine } from '../../services/engine';
import { CoachAvatar } from './CoachAvatar';
import {
  Lightbulb,
  Compass,
  ShieldAlert,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export interface GrandmasterCoachProps {
  fen: string;
  explanation: CoachExplanation;
  hintLevel?: CoachHintLevel;
  onRequestHint?: (nextLevel: CoachHintLevel, hintExplanation: CoachExplanation) => void;
  onExplainPosition?: (planExplanation: CoachExplanation) => void;
  onHighlightSquares?: (arrow: { from: Square; to: Square } | null) => void;
  onOpenLesson?: (courseId: CourseLevelId, lessonId: string) => void;
  defaultExpanded?: boolean;
  coachName?: string;
  coachTitle?: string;
  className?: string;
}

const STATE_META: Record<
  CoachState,
  { label: string; badgeClass: string; bubbleBorderClass: string }
> = {
  THINKING: {
    label: 'Analyzing Position',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    bubbleBorderClass: 'border-sky-500/40',
  },
  TEACHING: {
    label: 'Teaching Principle',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    bubbleBorderClass: 'border-emerald-500/40',
  },
  PRAISING: {
    label: 'Strong Move!',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    bubbleBorderClass: 'border-cyan-400/50',
  },
  WARNING: {
    label: 'Tactical Alert',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
    bubbleBorderClass: 'border-amber-400/50',
  },
  EXPLAINING: {
    label: 'Opponent Strategy',
    badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/50',
    bubbleBorderClass: 'border-indigo-400/50',
  },
  HINTING: {
    label: 'Coaching Hint',
    badgeClass: 'bg-amber-400/20 text-amber-200 border-amber-400/50',
    bubbleBorderClass: 'border-amber-400/50',
  },
  CELEBRATING: {
    label: 'Checkmate & Brilliance',
    badgeClass: 'bg-emerald-400/25 text-emerald-200 border-emerald-300/60',
    bubbleBorderClass: 'border-emerald-400/60',
  },
  ENCOURAGING: {
    label: 'Constructive Guidance',
    badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-400/40',
    bubbleBorderClass: 'border-teal-400/50',
  },
};

export const GrandmasterCoach: React.FC<GrandmasterCoachProps> = ({
  fen,
  explanation,
  hintLevel = 1,
  onRequestHint,
  onExplainPosition,
  onHighlightSquares,
  onOpenLesson,
  defaultExpanded = true,
  coachName = 'GM Elena Rostova',
  coachTitle = 'Grandmaster Chess Instructor',
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [showDeepNotes, setShowDeepNotes] = useState<boolean>(false);
  const [localExplanation, setLocalExplanation] = useState<CoachExplanation>(explanation);
  const [localHintStage, setLocalHintStage] = useState<CoachHintLevel>(hintLevel);
  const [voiceSettings, setVoiceSettings] = useState<VoiceCoachingSettings>(() =>
    coachVoiceService.getSettings()
  );

  useEffect(() => {
    setLocalExplanation(explanation);
    if (explanation.hintLevel) {
      setLocalHintStage(explanation.hintLevel);
    } else {
      setLocalHintStage(1);
    }

    if (explanation.shouldSpeak) {
      coachVoiceService.speak(explanation.speechBubble);
    }
  }, [explanation]);

  const handleToggleVoice = () => {
    const nextEnabled = !voiceSettings.enabled;
    const updated = coachVoiceService.updateSettings({
      enabled: nextEnabled,
      muted: !nextEnabled,
    });
    setVoiceSettings(updated);
    if (nextEnabled) {
      coachVoiceService.speak(localExplanation.speechBubble, 'high');
    }
  };

  const handleCycleVoiceRate = () => {
    const nextRate =
      voiceSettings.rate === 1.0 ? 1.2 : voiceSettings.rate === 1.2 ? 0.9 : 1.0;
    const updated = coachVoiceService.updateSettings({ rate: nextRate });
    setVoiceSettings(updated);
  };

  // Action 1: Progressive 3-Level Interactive Hint
  const handleTriggerHint = () => {
    const targetLevel: CoachHintLevel =
      localExplanation.state === 'HINTING'
        ? localHintStage === 1
          ? 2
          : localHintStage === 2
          ? 3
          : 1
        : 1;

    const hintExp = grandmasterCoach.generateProgressiveHint(
      fen,
      targetLevel,
      localExplanation.moveCount
    );
    setLocalHintStage(targetLevel);
    setLocalExplanation(hintExp);

    if (targetLevel === 3 && hintExp.bestAlternativeUci && onHighlightSquares) {
      onHighlightSquares(hintExp.bestAlternativeUci);
    }
    if (onRequestHint) {
      onRequestHint(targetLevel, hintExp);
    }
    coachVoiceService.speak(hintExp.speechBubble, 'high');
  };

  // Action 2: Explain Strategic Plan in Current Position
  const handleTriggerPositionPlan = () => {
    const planExp = grandmasterCoach.explainPositionPlan(
      fen,
      localExplanation.moveCount
    );
    setLocalExplanation(planExp);
    if (onExplainPosition) {
      onExplainPosition(planExp);
    }
    coachVoiceService.speak(planExp.speechBubble, 'high');
  };

  // Action 3: Threat Radar (Inspect Opponent's Primary Threat)
  const handleTriggerThreatCheck = () => {
    const threat = chessEngine.detectOpponentThreat(fen);
    if (threat) {
      const threatExp: CoachExplanation = {
        id: `threat-${Date.now()}`,
        state: 'WARNING',
        reaction: 'warning',
        headline: `Opponent Threat • Watch ${threat.san}`,
        speechBubble: `If given a free move, your opponent threatens ${threat.san} (${threat.from} → ${threat.to}). Check whether ${threat.to} needs extra protection or proactive counterplay.`,
        detailedExplanation:
          'Scanning your opponent’s top candidate move before making your own prevents tactical oversights and blunders.',
        threatSquare: threat.to,
        threatMoveSan: threat.san,
        fen,
        moveCount: localExplanation.moveCount,
        shouldSpeak: true,
      };
      setLocalExplanation(threatExp);
      coachVoiceService.speak(threatExp.speechBubble, 'high');
    } else {
      handleTriggerPositionPlan();
    }
  };

  const stateMeta = STATE_META[localExplanation.state] || STATE_META.TEACHING;
  const classMeta = localExplanation.classification
    ? getClassificationMeta(localExplanation.classification)
    : null;

  const nextHintButtonLabel =
    localExplanation.state === 'HINTING'
      ? localHintStage === 1
        ? 'Hint 2/3: Tactic'
        : localHintStage === 2
        ? 'Hint 3/3: Best Move'
        : 'Hint 1/3: Strategy'
      : 'Hint (Level 1/3)';

  return (
    <section
      data-testid="grandmaster-coach"
      aria-label="Grandmaster Chess Coach GM Elena"
      className={`flex flex-col bg-[#111624] border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 max-w-full ${className}`}
    >
      {/* Header: Avatar on Left + Name & Status + Voice & Collapse Controls */}
      <div className="flex items-center justify-between gap-2.5 px-4 py-2.5 bg-[#0a0e18] border-b border-white/[0.07]">
        <div className="flex items-center gap-3 min-w-0">
          <CoachAvatar
            reaction={localExplanation.reaction}
            state={localExplanation.state}
            size="sm"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 tracking-tight truncate">
                {coachName}
              </h3>
              <span
                data-testid="coach-state-badge"
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${stateMeta.badgeClass}`}
              >
                {stateMeta.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate font-medium">
              {coachTitle}
            </p>
          </div>
        </div>

        {/* Right Controls: Optional Voice Narration + Speed + Expand/Collapse */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            aria-label={
              voiceSettings.enabled ? 'Mute Coach Voice' : 'Enable Coach Voice'
            }
            onClick={handleToggleVoice}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors whitespace-nowrap ${
              voiceSettings.enabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-[#171c2b] border-white/10 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Optional Voice Coaching"
          >
            {voiceSettings.enabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">
              {voiceSettings.enabled ? 'Voice On' : 'Voice'}
            </span>
          </button>

          {voiceSettings.enabled && (
            <button
              type="button"
              aria-label="Adjust Voice Coaching Speed"
              onClick={handleCycleVoiceRate}
              className="px-2 py-1 rounded-lg bg-[#171c2b] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white whitespace-nowrap"
              title="Voice Speed"
            >
              {voiceSettings.rate}x
            </button>
          )}

          <button
            type="button"
            aria-label={isExpanded ? 'Collapse Grandmaster Coach' : 'Expand Grandmaster Coach'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2638] transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {/* Contextual Speech Bubble */}
          <div
            data-testid="coach-speech-bubble"
            className={`coach-bubble p-3.5 transition-colors duration-200 space-y-2 ${stateMeta.bubbleBorderClass}`}
          >
            {/* Move Classification & Headline Strip */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {classMeta && (
                  <span
                    data-testid="coach-move-classification"
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold border shrink-0 ${classMeta.bgClass}`}
                  >
                    {classMeta.badgeText} {classMeta.label}
                  </span>
                )}
                <span className="text-xs font-bold text-slate-100 truncate">
                  {localExplanation.headline}
                </span>
              </div>

              {typeof localExplanation.evalDeltaPawns === 'number' && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#0a0e18]/70 border border-white/10 shrink-0 ${
                    localExplanation.evalDeltaPawns >= 0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {localExplanation.evalDeltaPawns >= 0
                    ? `+${localExplanation.evalDeltaPawns}`
                    : localExplanation.evalDeltaPawns}{' '}
                  pawns
                </span>
              )}
            </div>

            {/* Primary Coach Guidance Text */}
            <p className="text-xs sm:text-[13px] text-slate-100 leading-relaxed font-normal">
              “{localExplanation.speechBubble}”
            </p>

            {/* Best Alternative & Expandable Concept Note */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px]">
              <button
                type="button"
                onClick={() => setShowDeepNotes(!showDeepNotes)}
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {showDeepNotes ? 'Hide Concept Breakdown' : 'Deep Concept Breakdown'}
                </span>
              </button>

              {localExplanation.bestAlternativeSan &&
                localExplanation.bestAlternativeSan !== localExplanation.moveSan && (
                  <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    Best Continuation: <strong>{localExplanation.bestAlternativeSan}</strong>
                  </span>
                )}
            </div>

            {/* Expandable Lesson & Tactical Breakdown */}
            {showDeepNotes && (
              <div
                data-testid="coach-deep-notes"
                className="pt-2.5 mt-1 border-t border-white/10 space-y-2 text-xs text-slate-300 animate-in fade-in duration-150"
              >
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {localExplanation.detailedExplanation}
                </p>

                <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] text-slate-400">
                  {localExplanation.conceptTag && (
                    <span className="px-2 py-0.5 rounded bg-[#0a0e18] border border-white/10 text-[10px]">
                      Principle:{' '}
                      <strong className="text-emerald-300">{localExplanation.conceptTag}</strong>
                    </span>
                  )}

                  {onOpenLesson &&
                    localExplanation.recommendedCourseId &&
                    localExplanation.recommendedLessonId && (
                      <button
                        type="button"
                        onClick={() =>
                          onOpenLesson(
                            localExplanation.recommendedCourseId!,
                            localExplanation.recommendedLessonId!
                          )
                        }
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        <span>Study Lesson</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                </div>
              </div>
            )}
          </div>

          {/* Three Contextual Action Controls (Mobile-First 3-Column Grid, Zero Horizontal Overflow) */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              data-testid="coach-hint-btn"
              onClick={handleTriggerHint}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-amber-300 border border-white/10 hover:border-amber-500/40 text-[11px] font-bold transition-all whitespace-nowrap truncate"
              title="Request Progressive 3-Step Coaching Hint"
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{nextHintButtonLabel}</span>
            </button>

            <button
              type="button"
              data-testid="coach-plan-btn"
              onClick={handleTriggerPositionPlan}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-emerald-300 border border-white/10 hover:border-emerald-500/40 text-[11px] font-bold transition-all whitespace-nowrap truncate"
              title="Explain Current Position Strategy & Plan"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Position Plan</span>
            </button>

            <button
              type="button"
              data-testid="coach-threat-btn"
              onClick={handleTriggerThreatCheck}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-rose-300 border border-white/10 hover:border-rose-500/40 text-[11px] font-bold transition-all whitespace-nowrap truncate"
              title="Inspect Opponent Threats"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">Threat Check</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
