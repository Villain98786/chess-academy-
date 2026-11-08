import React from 'react';
import { Color } from 'chess.js';

interface EvalBarProps {
  score: number; // centipawns (+ is White advantage, - is Black advantage)
  orientation?: Color;
  className?: string;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, orientation = 'w', className = '' }) => {
  // Convert centipawns to percentage between 5% and 95%
  // 0 -> 50%
  // +500 (5 pawns) -> ~85%
  // -500 (-5 pawns) -> ~15%
  const clampedScore = Math.max(-1500, Math.min(1500, score));
  // Sigmoid-like transformation for smooth chess eval bar
  const whitePercent = 50 + (50 * (2 / (1 + Math.exp(-clampedScore / 400)) - 1));
  const displayWhitePercent = Math.max(4, Math.min(96, whitePercent));

  const isWhiteOrientation = orientation === 'w';
  const topPercent = isWhiteOrientation ? (100 - displayWhitePercent) : displayWhitePercent;

  let textScore = '0.0';
  if (Math.abs(score) >= 90000) {
    textScore = score > 0 ? '+M' : '-M';
  } else {
    const val = (Math.abs(score) / 100).toFixed(1);
    textScore = score >= 0 ? `+${val}` : `-${val}`;
  }

  return (
    <div
      className={`relative w-4 sm:w-5 h-full rounded-md overflow-hidden bg-neutral-900 border border-neutral-700/60 shadow-inner flex flex-col ${className}`}
      title={`Evaluation: ${textScore}`}
    >
      {/* Black's share (top if White orientation) */}
      <div
        className="w-full bg-neutral-900 transition-all duration-300 ease-out"
        style={{ height: `${topPercent}%` }}
      />
      {/* White's share (bottom if White orientation) */}
      <div
        className="w-full bg-emerald-100 transition-all duration-300 ease-out shadow-sm"
        style={{ height: `${100 - topPercent}%` }}
      />

      {/* Floating score label */}
      <div
        className={`absolute inset-x-0 text-[10px] font-bold text-center select-none font-mono tracking-tighter ${
          score >= 0 ? 'bottom-1 text-neutral-900' : 'top-1 text-emerald-100'
        }`}
      >
        {textScore}
      </div>
    </div>
  );
};
