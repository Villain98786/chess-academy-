import React from 'react';
import { Color, PieceSymbol } from 'chess.js';
import { ChessPieceIcon } from './ChessPieces';

interface CapturedPiecesProps {
  captured: PieceSymbol[]; // List of pieces captured by this player
  playerColor: Color;
  materialAdvantage?: number; // e.g. +3
}

const PIECE_WEIGHTS: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({
  captured,
  playerColor,
  materialAdvantage,
}) => {
  // Sort pieces by value
  const sorted = [...captured].sort((a, b) => (PIECE_WEIGHTS[b] || 0) - (PIECE_WEIGHTS[a] || 0));

  // The pieces captured were of the OPPOSITE color of this player
  const capturedPieceColor: Color = playerColor === 'w' ? 'b' : 'w';

  return (
    <div className="flex items-center gap-1 min-h-[26px] flex-wrap select-none">
      <div className="flex items-center -space-x-1.5">
        {sorted.map((p, idx) => (
          <div key={idx} className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm transition-transform hover:scale-125">
            <ChessPieceIcon type={p} color={capturedPieceColor} />
          </div>
        ))}
      </div>

      {materialAdvantage && materialAdvantage > 0 ? (
        <span className="text-xs font-bold text-emerald-400 font-mono ml-1.5 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
          +{materialAdvantage}
        </span>
      ) : null}
    </div>
  );
};
