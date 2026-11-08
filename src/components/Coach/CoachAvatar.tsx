import React from 'react';
import { CoachAvatarReaction, CoachState } from '../../types/chess';

interface CoachAvatarProps {
  reaction: CoachAvatarReaction;
  state: CoachState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATE_RING_STYLES: Record<CoachState, string> = {
  THINKING: 'border-sky-400/70 bg-sky-950/60',
  TEACHING: 'border-emerald-400/70 bg-emerald-950/60',
  PRAISING: 'border-cyan-400/80 bg-cyan-950/60',
  WARNING: 'border-amber-400/80 bg-amber-950/60',
  EXPLAINING: 'border-indigo-400/70 bg-indigo-950/60',
  HINTING: 'border-amber-300/80 bg-amber-950/60',
  CELEBRATING: 'border-emerald-300/90 bg-emerald-900/70',
  ENCOURAGING: 'border-teal-400/70 bg-teal-950/60',
};

const STATE_CORNER_ICON: Record<CoachState, string> = {
  THINKING: '⏳',
  TEACHING: '♟️',
  PRAISING: '★',
  WARNING: '⚠️',
  EXPLAINING: '🧭',
  HINTING: '💡',
  CELEBRATING: '👑',
  ENCOURAGING: '🛡️',
};

/**
 * Illustrated SVG portrait of Grandmaster Elena with consistent character identity
 * and lightweight compositor-safe expressions for all 6 reactions.
 */
export const CoachAvatar: React.FC<CoachAvatarProps> = React.memo(
  ({ reaction, state, size = 'md', className = '' }) => {
    const dims =
      size === 'sm'
        ? 'w-10 h-10'
        : size === 'lg'
        ? 'w-14 h-14'
        : 'w-12 h-12';

    const ringStyle = STATE_RING_STYLES[state] || STATE_RING_STYLES.TEACHING;

    return (
      <div
        data-testid="coach-avatar"
        data-reaction={reaction}
        data-coach-state={state}
        className={`relative shrink-0 rounded-2xl border-2 p-0.5 transition-transform duration-200 select-none ${dims} ${ringStyle} ${
          reaction === 'celebrating'
            ? 'scale-105'
            : reaction === 'warning'
            ? 'scale-102'
            : 'scale-100'
        } ${className}`}
      >
        <svg
          viewBox="0 0 64 64"
          className="w-full h-full rounded-xl overflow-hidden"
          role="img"
          aria-label={`Grandmaster Elena (${state})`}
        >
          <defs>
            <linearGradient id="elenaBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f2922" />
              <stop offset="100%" stopColor="#111827" />
            </linearGradient>
            <linearGradient id="elenaBlazer" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <linearGradient id="elenaHair" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
          </defs>

          {/* Studio Backdrop */}
          <rect width="64" height="64" rx="12" fill="url(#elenaBg)" />

          {/* Subtle Chessboard Grid Accent */}
          <g opacity="0.12" fill="#34d399">
            <rect x="4" y="4" width="8" height="8" />
            <rect x="20" y="4" width="8" height="8" />
            <rect x="12" y="12" width="8" height="8" />
            <rect x="48" y="8" width="8" height="8" />
          </g>

          {/* Back Hair Silhouette */}
          <path
            d="M16 28 C14 14, 50 14, 48 28 L50 48 C42 50, 22 50, 14 48 Z"
            fill="url(#elenaHair)"
          />

          {/* Grandmaster Blazer & Gold Collar Pin */}
          <path
            d="M12 64 C13 48, 22 44, 32 44 C42 44, 51 48, 52 64 Z"
            fill="url(#elenaBlazer)"
          />
          <path d="M26 44 L32 54 L38 44 Z" fill="#f8fafc" />
          {/* Gold Grandmaster Lapel Pin */}
          <circle cx="40" cy="53" r="2.2" fill="#fbbf24" />

          {/* Neck & Head */}
          <rect x="28" y="38" width="8" height="8" rx="3" fill="#f5d0b5" />
          <ellipse cx="32" cy="28" rx="11.5" ry="13" fill="#fde2cc" />

          {/* Side-Swept Hair Bangs */}
          <path
            d="M20 24 C22 14, 42 13, 44 25 C40 19, 28 19, 20 24 Z"
            fill="url(#elenaHair)"
          />

          {/* Stylish Grandmaster Glasses */}
          <g stroke="#fbbf24" strokeWidth="1.4" fill="none" opacity="0.9">
            <rect x="23" y="24.5" width="7.5" height="5" rx="2" />
            <rect x="33.5" y="24.5" width="7.5" height="5" rx="2" />
            <line x1="30.5" y1="26.8" x2="33.5" y2="26.8" />
          </g>

          {/* Dynamic Eyebrows based on Reaction */}
          {reaction === 'warning' ? (
            <g stroke="#1e1b4b" strokeWidth="1.6" strokeLinecap="round">
              <line x1="23.5" y1="22.5" x2="29.5" y2="23.8" />
              <line x1="34.5" y1="23.8" x2="40.5" y2="22.5" />
            </g>
          ) : reaction === 'thinking' ? (
            <g stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round">
              <line x1="23.5" y1="23.5" x2="29.5" y2="23.2" />
              <line x1="34.5" y1="22.0" x2="40.5" y2="23.2" />
            </g>
          ) : (
            <g stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round">
              <path d="M23.5 23.2 Q26.5 21.8 29.5 23.2" fill="none" />
              <path d="M34.5 23.2 Q37.5 21.8 40.5 23.2" fill="none" />
            </g>
          )}

          {/* Eyes */}
          {reaction === 'celebrating' || reaction === 'happy' ? (
            <g stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" fill="none">
              <path d="M25 27 Q26.8 25.3 28.5 27" />
              <path d="M35.5 27 Q37.2 25.3 39 27" />
            </g>
          ) : (
            <g fill="#0f172a">
              <circle
                cx={reaction === 'thinking' ? '27.4' : '26.8'}
                cy="27"
                r="1.5"
              />
              <circle
                cx={reaction === 'thinking' ? '37.8' : '37.2'}
                cy="27"
                r="1.5"
              />
              <circle cx="26.3" cy="26.5" r="0.5" fill="#ffffff" />
              <circle cx="36.7" cy="26.5" r="0.5" fill="#ffffff" />
            </g>
          )}

          {/* Mouth Expression */}
          {reaction === 'celebrating' ? (
            <path
              d="M27.5 33.5 Q32 38.5 36.5 33.5 Z"
              fill="#e11d48"
              stroke="#881337"
              strokeWidth="0.8"
            />
          ) : reaction === 'happy' ? (
            <path
              d="M28 34 Q32 37.2 36 34"
              stroke="#be123c"
              strokeWidth="1.7"
              strokeLinecap="round"
              fill="none"
            />
          ) : reaction === 'warning' ? (
            <ellipse
              cx="32"
              cy="35"
              rx="2.4"
              ry="1.8"
              fill="#9f1239"
            />
          ) : reaction === 'thinking' ? (
            <line
              x1="29.5"
              y1="35"
              x2="34.5"
              y2="34.5"
              stroke="#9f1239"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ) : (
            <path
              d="M28.8 34.3 Q32 36.3 35.2 34.3"
              stroke="#be123c"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>

        {/* Corner State Emblem */}
        <span
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-950 border border-neutral-700 flex items-center justify-center text-[10px] leading-none shadow-sm"
          title={`Coach State: ${state}`}
        >
          {STATE_CORNER_ICON[state]}
        </span>
      </div>
    );
  }
);

CoachAvatar.displayName = 'CoachAvatar';
