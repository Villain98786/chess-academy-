import React, { useEffect, useRef } from 'react';
import { GameMove } from '../../types/chess';
import { Copy, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Terminal } from 'lucide-react';

interface MoveHistoryProps {
  moves: GameMove[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  openingEco?: string;
  openingName?: string;
  className?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  openingEco,
  openingName,
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
  const turns: {
    moveNumber: number;
    white?: GameMove;
    whiteIdx?: number;
    black?: GameMove;
    blackIdx?: number;
  }[] = [];
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

  const getBadgeInfo = (classification?: string) => {
    switch (classification) {
      case 'brilliant':
        return { text: 'text-cyan-400 font-extrabold', chip: '!!', chipClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
      case 'great':
        return { text: 'text-sky-400 font-bold', chip: '!', chipClass: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
      case 'best':
        return { text: 'text-emerald-400 font-bold', chip: '★', chipClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'inaccuracy':
        return { text: 'text-amber-300', chip: '?!', chipClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'mistake':
        return { text: 'text-orange-400 font-semibold', chip: '?', chipClass: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
      case 'blunder':
        return { text: 'text-rose-400 font-bold', chip: '??', chipClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };
      default:
        return { text: '', chip: '', chipClass: '' };
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#111624] border border-white/10 rounded-xl overflow-hidden shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0e18] border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300 truncate">
            Move Notation
          </span>
        </div>
        <div className="flex items-center gap-2">
          {openingEco && (
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 truncate max-w-[140px]">
              {openingEco} {openingName ? `• ${openingName}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopyPgn}
            disabled={moves.length === 0}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#171c2b] hover:bg-[#1f2638] border border-white/10 text-[10px] font-mono text-slate-300 hover:text-emerald-400 disabled:opacity-30 transition-colors"
            title="Copy PGN Notation"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
            <span>{copied ? 'Copied' : 'PGN'}</span>
          </button>
        </div>
      </div>

      {/* Algebraic Move Matrix */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto divide-y divide-white/[0.04] font-mono text-xs max-h-56 select-none"
      >
        {turns.length === 0 ? (
          <div className="text-slate-500 text-center py-8 italic text-xs font-sans">
            Algebraic move log will populate as pieces advance...
          </div>
        ) : (
          turns.map((turn, idx) => {
            const wInfo = getBadgeInfo(turn.white?.classification);
            const bInfo = getBadgeInfo(turn.black?.classification);
            const isRowActive =
              currentMoveIndex === turn.whiteIdx || currentMoveIndex === turn.blackIdx;

            return (
              <div
                key={turn.moveNumber}
                className={`grid grid-cols-7 items-center px-3 py-1.5 transition-colors ${
                  isRowActive
                    ? 'bg-emerald-500/[0.07] border-l-2 border-emerald-400'
                    : idx % 2 === 1
                    ? 'bg-[#171c2b]/40 hover:bg-[#1f2638]/60'
                    : 'hover:bg-[#1f2638]/60'
                }`}
              >
                <span className="col-span-1 text-slate-500 font-semibold text-[11px]">
                  {turn.moveNumber}.
                </span>

                {/* White Move */}
                <button
                  type="button"
                  onClick={() => turn.whiteIdx !== undefined && onSelectMove(turn.whiteIdx)}
                  className={`col-span-3 flex items-center justify-between text-left px-2 py-1 rounded transition-colors ${
                    currentMoveIndex === turn.whiteIdx
                      ? 'bg-emerald-500/20 text-emerald-300 font-bold ring-1 ring-emerald-500/40'
                      : 'text-slate-200 hover:bg-white/5'
                  } ${wInfo.text}`}
                >
                  <span>{turn.white?.san}</span>
                  {wInfo.chip && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded border leading-none ${wInfo.chipClass}`}
                    >
                      {wInfo.chip}
                    </span>
                  )}
                </button>

                {/* Black Move */}
                {turn.black ? (
                  <button
                    type="button"
                    onClick={() => turn.blackIdx !== undefined && onSelectMove(turn.blackIdx)}
                    className={`col-span-3 flex items-center justify-between text-left px-2 py-1 rounded transition-colors ${
                      currentMoveIndex === turn.blackIdx
                        ? 'bg-emerald-500/20 text-emerald-300 font-bold ring-1 ring-emerald-500/40'
                        : 'text-slate-300 hover:bg-white/5'
                    } ${bInfo.text}`}
                  >
                    <span>{turn.black.san}</span>
                    {bInfo.chip && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded border leading-none ${bInfo.chipClass}`}
                      >
                        {bInfo.chip}
                      </span>
                    )}
                  </button>
                ) : (
                  <div className="col-span-3 px-2 py-1 text-slate-600 italic text-[11px]">...</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Navigation Scrubber Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0a0e18] border-t border-white/10">
        <span className="text-[10px] font-mono text-slate-500">
          Ply {Math.max(0, currentMoveIndex + 1)}/{moves.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectMove(-1)}
            disabled={moves.length === 0 || currentMoveIndex === -1}
            className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Start Position"
          >
            <ChevronFirst className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
            disabled={moves.length === 0 || currentMoveIndex === -1}
            className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Previous Move"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectMove(Math.min(moves.length - 1, currentMoveIndex + 1))}
            disabled={moves.length === 0 || currentMoveIndex >= moves.length - 1}
            className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Next Move"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectMove(moves.length - 1)}
            disabled={moves.length === 0 || currentMoveIndex === moves.length - 1}
            className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            title="Latest Position"
          >
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
