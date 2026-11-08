import React, { useEffect, useRef } from 'react';
import { GameMove } from '../../types/chess';
import { Copy, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

interface MoveHistoryProps {
  moves: GameMove[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  className?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [moves.length]);

  // Group moves into turns (White move + Black move)
  const turns: { moveNumber: number; white?: GameMove; whiteIdx?: number; black?: GameMove; blackIdx?: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    turns.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      whiteIdx: i,
      black: moves[i + 1],
      blackIdx: i + 1,
    });
  }

  const handleCopyPgn = () => {
    let pgn = '';
    turns.forEach((t) => {
      pgn += `${t.moveNumber}. ${t.white?.san || ''} ${t.black?.san || ''} `;
    });
    navigator.clipboard.writeText(pgn.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBadgeClass = (classification?: string) => {
    switch (classification) {
      case 'brilliant':
        return 'text-cyan-400 font-extrabold';
      case 'best':
        return 'text-emerald-400 font-bold';
      case 'inaccuracy':
        return 'text-amber-400';
      case 'mistake':
        return 'text-orange-400';
      case 'blunder':
        return 'text-rose-500 font-bold';
      default:
        return '';
    }
  };

  return (
    <div className={`flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-neutral-950 border-b border-neutral-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Move History</span>
        <button
          onClick={handleCopyPgn}
          disabled={moves.length === 0}
          className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-emerald-400 disabled:opacity-30 transition-colors"
          title="Copy PGN"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'PGN'}</span>
        </button>
      </div>

      {/* Move list */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs max-h-56 select-none">
        {turns.length === 0 ? (
          <div className="text-neutral-500 text-center py-6 italic text-xs">Moves will appear here as you play...</div>
        ) : (
          turns.map((turn) => (
            <div key={turn.moveNumber} className="flex items-center rounded hover:bg-neutral-800/40 px-2 py-0.5 transition-colors">
              <span className="w-8 text-neutral-500 font-semibold">{turn.moveNumber}.</span>
              
              {/* White Move */}
              <button
                onClick={() => turn.whiteIdx !== undefined && onSelectMove(turn.whiteIdx)}
                className={`flex-1 text-left px-2 py-1 rounded transition-colors ${
                  currentMoveIndex === turn.whiteIdx
                    ? 'bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-neutral-200 hover:bg-neutral-800'
                } ${getBadgeClass(turn.white?.classification)}`}
              >
                {turn.white?.san}
              </button>

              {/* Black Move */}
              {turn.black ? (
                <button
                  onClick={() => turn.blackIdx !== undefined && onSelectMove(turn.blackIdx)}
                  className={`flex-1 text-left px-2 py-1 rounded transition-colors ${
                    currentMoveIndex === turn.blackIdx
                      ? 'bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  } ${getBadgeClass(turn.black?.classification)}`}
                >
                  {turn.black.san}
                </button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation playback buttons */}
      <div className="flex items-center justify-center gap-1 p-2 bg-neutral-950 border-t border-neutral-800">
        <button
          onClick={() => onSelectMove(-1)}
          disabled={moves.length === 0 || currentMoveIndex === -1}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Start Position"
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={moves.length === 0 || currentMoveIndex === -1}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Previous Move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={moves.length === 0 || currentMoveIndex >= moves.length - 1}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Next Move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(moves.length - 1)}
          disabled={moves.length === 0 || currentMoveIndex === moves.length - 1}
          className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
          title="Latest Position"
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
