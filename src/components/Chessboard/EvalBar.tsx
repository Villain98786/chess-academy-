import React from 'react';
import { Color } from 'chess.js';

interface EvalBarProps {
  score: number; // centipawns (+ is White advantage, - is Black advantage)
  orientation?: Color;
  className?: string;
}

export const EvalBar: React.FC<EvalBarProps> = ({ score, orientation = 'w', className = '' }) => {
  const clampedScore = Math.max(-1500, Math.min(1500, score));
  // Sigmoid-like transformation for smooth chess eval bar
  const whitePercent = 50 + 50 * (2 / (1 + Math.exp(-clampedScore / 400)) - 1);
  const displayWhitePercent = Math.max(4, Math.min(96, whitePercent));

  const isWhiteOrientation = orientation === 'w';
  const topPercent = isWhiteOrientation ? 100 - displayWhitePercent : displayWhitePercent;

  let textScore = '0.0';
  if (Math.abs(score) >= 90000) {
    textScore = score > 0 ? '+M' : '-M';
  } else {
    const val = (Math.abs(score) / 100).toFixed(1);
    textScore = score >= 0 ? `+${val}` : `-${val}`;
  }

  return (
    <div
      className={`relative w-5 sm:w-6 h-full rounded-xl overflow-hidden bg-[#0a0e18] border border-white/10 shadow-2xl flex flex-col shrink-0 ${className}`}
      title={`Stockfish 16.1 NNUE Evaluation: ${textScore}`}
    >
      {/* Top portion (Black's share if White orientation) */}
      <div
        className="w-full bg-[#0f172a] transition-all duration-300 ease-out"
        style={{ height: `${topPercent}%` }}
      />
      {/* Equilibrium centerline tick */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-400/50 z-10 pointer-events-none" />
      {/* Bottom portion (White's share if White orientation) */}
      <div
        className="w-full bg-[#f8fafc] transition-all duration-300 ease-out shadow-[0_-2px_10px_rgba(248,250,252,0.2)]"
        style={{ height: `${100 - topPercent}%` }}
      />

      {/* Floating score label */}
      <div
        className={`absolute inset-x-0 text-[9px] sm:text-[10px] font-black text-center select-none font-mono tracking-tighter z-20 ${
          score >= 0 ? 'bottom-1.5 text-[#0a0e18]' : 'top-1.5 text-[#f8fafc]'
        }`}
      >
        {textScore}
      </div>
    </div>
  );
};
