import React, { useState, useEffect, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import confetti from 'canvas-confetti';
import { CHESS_OPENINGS } from '../data/openings';
import { ChessOpening, AppSettings, CoachExplanation } from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { EvalBar } from '../components/Chessboard/EvalBar';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { soundManager } from '../services/sound';
import { chessEngine } from '../services/engine';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  BarChart2,
  Play,
  CheckCircle,
  Search,
  Database,
  Cpu,
  BookOpen,
  Compass,
} from 'lucide-react';

interface OpeningsPageProps {
  settings: AppSettings;
}

export const OpeningsPage: React.FC<OpeningsPageProps> = ({ settings }) => {
  const [selectedOpening, setSelectedOpening] = useState<ChessOpening>(CHESS_OPENINGS[0]);
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState<boolean>(false);
  const [practiceStatus, setPracticeStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'masters' | 'repertoire'>('masters');

  const updateBoardToPly = (opening: ChessOpening, ply: number) => {
    const tempChess = new Chess();
    let prevMove: { from: Square; to: Square } | null = null;

    for (let i = 0; i < ply && i < opening.moves.length; i++) {
      try {
        const m = tempChess.move(opening.moves[i]);
        if (m) {
          prevMove = { from: m.from, to: m.to };
        }
      } catch {
        break;
      }
    }

    if (ply < opening.moves.length) {
      try {
        const nextSim = new Chess(tempChess.fen());
        const nextBook = nextSim.move(opening.moves[ply]);
        if (nextBook) {
          setHintMove({ from: nextBook.from, to: nextBook.to });
        }
      } catch {
        setHintMove(null);
      }
    } else {
      setHintMove(null);
    }

    setChess(tempChess);
    setCurrentPly(ply);
    setLastMove(prevMove);
  };

  const handleSelectOpening = (opening: ChessOpening) => {
    setSelectedOpening(opening);
    setIsPracticeMode(false);
    setPracticeStatus(null);
    updateBoardToPly(opening, opening.moves.length);
  };

  useEffect(() => {
    updateBoardToPly(selectedOpening, selectedOpening.moves.length);
  }, [selectedOpening]);

  const handleStartPractice = () => {
    setIsPracticeMode(true);
    setPracticeStatus(`Play 1. ${selectedOpening.moves[0]} to start the ${selectedOpening.name}!`);
    updateBoardToPly(selectedOpening, 0);
  };

  const handlePracticeMove = (move: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (!isPracticeMode || currentPly >= selectedOpening.moves.length) return;

    const expectedSan = selectedOpening.moves[currentPly];
    try {
      const temp = new Chess(chess.fen());
      const res = temp.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });
      if (!res) return;

      if (res.san === expectedSan) {
        const nextPly = currentPly + 1;
        updateBoardToPly(selectedOpening, nextPly);

        if (nextPly >= selectedOpening.moves.length) {
          setPracticeStatus(
            `Opening line mastered! You completed all ${selectedOpening.moves.length} book moves.`
          );
          soundManager.playPuzzleCorrect();
          confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
        } else {
          const oppSan = selectedOpening.moves[nextPly];
          setPracticeStatus(`Correct (${res.san})! Opponent responds with ${oppSan}...`);
          setTimeout(() => {
            const afterOppPly = nextPly + 1;
            updateBoardToPly(selectedOpening, afterOppPly);
            soundManager.playMove();
            if (afterOppPly >= selectedOpening.moves.length) {
              setPracticeStatus(
                `Opening line mastered! You completed the ${selectedOpening.name}.`
              );
              soundManager.playPuzzleCorrect();
              confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
            } else {
              setPracticeStatus(`Your turn: Play ${selectedOpening.moves[afterOppPly]}`);
            }
          }, 420);
        }
      } else {
        soundManager.playPuzzleWrong();
        setPracticeStatus(
          `Book move is ${expectedSan} (you played ${res.san}). Follow the cyan/emerald arrow!`
        );
      }
    } catch {
      // Ignore
    }
  };

  const handleStepForward = () => {
    if (currentPly < selectedOpening.moves.length) {
      updateBoardToPly(selectedOpening, currentPly + 1);
      soundManager.playMove();
    }
  };

  const handleStepBack = () => {
    if (currentPly > 0) {
      updateBoardToPly(selectedOpening, currentPly - 1);
      soundManager.playMove();
    }
  };

  const filteredOpenings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return CHESS_OPENINGS;
    return CHESS_OPENINGS.filter(
      (op) =>
        op.name.toLowerCase().includes(q) ||
        op.eco.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const evalScore = useMemo(() => chessEngine.evaluatePosition(chess), [chess]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Opening Explorer Header & Telemetry Bar (Stitch Screen 6) */}
      <section className="rounded-2xl bg-[#111624] border border-white/[0.08] p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30">
                ECO {selectedOpening.eco} • Theoretical Mainline
              </span>
              <span className="text-xs font-mono text-slate-400">
                {selectedOpening.moves
                  .map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m))
                  .join(' ')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {selectedOpening.name}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-[#171c2b] border border-white/[0.07] rounded-xl px-3.5 py-2 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-[9px] font-mono uppercase text-slate-400">Master Archive</div>
                <div className="text-xs font-mono font-bold text-slate-100">12.4M Games</div>
              </div>
            </div>
            <div className="bg-[#171c2b] border border-white/[0.07] rounded-xl px-3.5 py-2 flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[9px] font-mono uppercase text-slate-400">Stockfish 16.1</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Depth 32 NNUE ({chessEngine.formatScore(evalScore)})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs, Search Input & Opening Selector Pills */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 bg-[#0a0e18] p-1 rounded-xl border border-white/10 self-start">
            <button
              type="button"
              onClick={() => setActiveTab('masters')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'masters'
                  ? 'bg-emerald-500 text-[#070a12]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Masters DB (2200+)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('repertoire')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'repertoire'
                  ? 'bg-emerald-500 text-[#070a12]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Repertoire Studio
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ECO code (B90, C65) or Opening Name..."
              className="w-full bg-[#0a0e18] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Horizontal Opening Selector Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filteredOpenings.map((op) => {
            const isSelected = selectedOpening.id === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => handleSelectOpening(op)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-[#171c2b] text-slate-400 hover:text-white hover:bg-[#1f2638] border-white/[0.06]'
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[#0a0e18] text-cyan-400">
                  {op.eco}
                </span>
                <span>{op.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Main 12-Col Explorer Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 6 Cols: Interactive Board, Move Stepper & Practice Line Drill */}
        <div className="lg:col-span-6 flex flex-col items-center bg-[#111624] border border-white/[0.08] rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="w-full max-w-[540px] flex items-center justify-between text-xs px-3.5 py-2.5 bg-[#171c2b] border border-white/[0.07] rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {selectedOpening.eco}
              </span>
              <span className="font-bold text-slate-100">{selectedOpening.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartPractice}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-[#070a12] text-xs font-extrabold shadow transition-all"
              >
                <Play className="w-3 h-3 fill-[#070a12]" />
                <span>Practice Line</span>
              </button>
              <span className="text-slate-400 font-mono text-[11px]">
                Ply {currentPly}/{selectedOpening.moves.length}
              </span>
            </div>
          </div>

          {practiceStatus && (
            <div className="w-full max-w-[540px] px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{practiceStatus}</span>
            </div>
          )}

          <div className="flex gap-2.5 sm:gap-3.5 items-stretch justify-center w-full">
            {settings.showEvalBar && (
              <EvalBar
                score={evalScore}
                orientation="w"
                className="h-auto min-h-[280px] max-h-[520px]"
              />
            )}
            <div className="flex-1 max-w-[520px] aspect-square flex items-center justify-center">
              <Chessboard
                chess={chess}
                orientation="w"
                theme={settings.boardTheme}
                showCoordinates={settings.showCoordinates}
                showLegalMoves={true}
                interactive={isPracticeMode && currentPly < selectedOpening.moves.length}
                lastMove={lastMove}
                hintMove={hintMove}
                onMove={handlePracticeMove}
              />
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="w-full max-w-[540px] flex flex-wrap items-center justify-between px-2 gap-2 pt-2 border-t border-white/[0.07]">
            <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-1">
              {selectedOpening.moves.map((san, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateBoardToPly(selectedOpening, idx + 1)}
                  className={`px-2 py-1 rounded-lg text-[11px] transition-colors ${
                    currentPly === idx + 1
                      ? 'bg-emerald-500 text-[#070a12] font-bold'
                      : 'text-slate-400 hover:bg-[#171c2b] hover:text-white'
                  }`}
                >
                  {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}.` : ''}
                  {san}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Opening Start"
                onClick={() => updateBoardToPly(selectedOpening, 0)}
                disabled={currentPly === 0}
                className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-300 disabled:opacity-30"
              >
                <ChevronFirst className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Previous Opening Move"
                onClick={handleStepBack}
                disabled={currentPly === 0}
                className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-300 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next Opening Move"
                onClick={handleStepForward}
                disabled={currentPly >= selectedOpening.moves.length}
                className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-300 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Opening End"
                onClick={() => updateBoardToPly(selectedOpening, selectedOpening.moves.length)}
                disabled={currentPly >= selectedOpening.moves.length}
                className="p-1.5 rounded-lg bg-[#171c2b] hover:bg-[#1f2638] text-slate-300 disabled:opacity-30"
              >
                <ChevronLast className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right 6 Cols: Candidate Move Tree Table, Strategic Plans, Traps & Grandmaster Coach */}
        <div className="lg:col-span-6 space-y-5">
          {/* Candidate Move Tree & Master Win-Rate Distribution Card */}
          <div className="bg-[#111624] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Master Database Win / Draw / Loss Distribution
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                White {selectedOpening.whiteWinRate}% • Draw {selectedOpening.drawRate}% • Black{' '}
                {selectedOpening.blackWinRate}%
              </span>
            </div>

            {/* W/D/L Stacked Bar */}
            <div className="w-full h-4 rounded-lg overflow-hidden flex bg-[#0a0e18] border border-white/10 font-mono text-[9px] font-bold">
              <div
                style={{ width: `${selectedOpening.whiteWinRate}%` }}
                className="bg-slate-100 text-[#070a12] h-full flex items-center justify-center"
                title="White Win %"
              >
                {selectedOpening.whiteWinRate}%
              </div>
              <div
                style={{ width: `${selectedOpening.drawRate}%` }}
                className="bg-slate-600 text-white h-full flex items-center justify-center"
                title="Draw %"
              >
                {selectedOpening.drawRate}%
              </div>
              <div
                style={{ width: `${selectedOpening.blackWinRate}%` }}
                className="bg-[#1e293b] text-slate-300 h-full flex items-center justify-center"
                title="Black Win %"
              >
                {selectedOpening.blackWinRate}%
              </div>
            </div>

            {/* Book Continuation Sequence Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="text-[10px] text-slate-400 uppercase border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2 px-2">Ply</th>
                    <th className="py-2 px-2">Book Move</th>
                    <th className="py-2 px-2">Classification</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {selectedOpening.moves.map((san, idx) => {
                    const isCurrent = currentPly === idx + 1;
                    return (
                      <tr
                        key={idx}
                        onClick={() => updateBoardToPly(selectedOpening, idx + 1)}
                        className={`cursor-pointer transition-colors ${
                          isCurrent ? 'bg-emerald-500/15 text-emerald-300' : 'hover:bg-[#171c2b]'
                        }`}
                      >
                        <td className="py-2 px-2 text-slate-400">
                          {Math.floor(idx / 2) + 1}
                          {idx % 2 === 0 ? '.' : '...'}
                        </td>
                        <td className="py-2 px-2 font-bold text-slate-100">{san}</td>
                        <td className="py-2 px-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                            Mainline Book
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-cyan-400 font-sans text-[11px]">
                          Inspect →
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Core Strategic Plans & Tactical Traps Card */}
          <div className="bg-[#111624] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Strategic Blueprint & Key Ideas</span>
              </h4>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {selectedOpening.description}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-300 mt-3">
                {selectedOpening.keyIdeas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Traps & Tricks */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-400 uppercase tracking-wider text-[11px]">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Tactical Traps & Common Blunders</span>
              </div>
              <p>{selectedOpening.trapsAndTricks}</p>
            </div>
          </div>

          {/* Interactive Grandmaster Coach Opening Explainer */}
          <GrandmasterCoach
            fen={chess.fen()}
            explanation={
              {
                id: `opening-${selectedOpening.id}-${currentPly}`,
                state: 'TEACHING',
                reaction: 'explaining',
                headline: `${selectedOpening.eco}: ${selectedOpening.name}`,
                speechBubble: practiceStatus || selectedOpening.description,
                detailedExplanation: `Key Strategic Ideas: ${selectedOpening.keyIdeas.join(
                  ' • '
                )} | Watch Out For: ${selectedOpening.trapsAndTricks}`,
                conceptTag: `${selectedOpening.eco} Opening Theory`,
                fen: chess.fen(),
                moveCount: currentPly,
                shouldSpeak: false,
              } as CoachExplanation
            }
            onHighlightSquares={(arrow) => setHintMove(arrow)}
          />
        </div>
      </div>
    </div>
  );
};
