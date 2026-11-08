import React, { useState, useEffect } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import confetti from 'canvas-confetti';
import { CHESS_OPENINGS } from '../data/openings';
import { ChessOpening, AppSettings, CoachExplanation } from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { soundManager } from '../services/sound';
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

    // In practice mode, compute the next book move arrow hint
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
          setPracticeStatus(`Opening line mastered! You completed all ${selectedOpening.moves.length} book moves.`);
          soundManager.playPuzzleCorrect();
          confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
        } else {
          // Automatically play opponent book reply after 400ms
          const oppSan = selectedOpening.moves[nextPly];
          setPracticeStatus(`Correct (${res.san})! Opponent responds with ${oppSan}...`);
          setTimeout(() => {
            const afterOppPly = nextPly + 1;
            updateBoardToPly(selectedOpening, afterOppPly);
            soundManager.playMove();
            if (afterOppPly >= selectedOpening.moves.length) {
              setPracticeStatus(`Opening line mastered! You completed the ${selectedOpening.name}.`);
              soundManager.playPuzzleCorrect();
              confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
            } else {
              setPracticeStatus(`Your turn: Play ${selectedOpening.moves[afterOppPly]}`);
            }
          }, 420);
        }
      } else {
        soundManager.playPuzzleWrong();
        setPracticeStatus(`Book move is ${expectedSan} (you played ${res.san}). Follow the arrow!`);
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

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Openings Grid Selector */}
      <div className="flex items-center gap-2 overflow-x-auto bg-neutral-900 border border-neutral-800 p-2 rounded-2xl">
        {CHESS_OPENINGS.map((op) => {
          const isSelected = selectedOpening.id === op.id;
          return (
            <button
              key={op.id}
              type="button"
              onClick={() => handleSelectOpening(op)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <span className="font-mono text-[10px] opacity-80">{op.eco}</span>
              <span>{op.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Board & Move Stepper */}
        <div className="lg:col-span-7 flex flex-col items-center bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="w-full max-w-[520px] flex items-center justify-between text-xs px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold">{selectedOpening.eco}</span>
              <span className="font-bold text-white">{selectedOpening.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleStartPractice}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow transition-all"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Practice Line</span>
              </button>
              <span className="text-neutral-400 font-mono text-[11px]">
                Ply {currentPly}/{selectedOpening.moves.length}
              </span>
            </div>
          </div>

          {practiceStatus && (
            <div className="w-full max-w-[520px] px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{practiceStatus}</span>
            </div>
          )}

          <div className="w-full max-w-[520px] aspect-square flex items-center justify-center">
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

          {/* Stepper Controls */}
          <div className="w-full max-w-[520px] flex items-center justify-between px-2 gap-2">
            <div className="flex items-center gap-1 font-mono text-xs overflow-x-auto py-1">
              {selectedOpening.moves.map((san, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => updateBoardToPly(selectedOpening, idx + 1)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    currentPly === idx + 1
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-neutral-400 hover:bg-neutral-800'
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
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              >
                <ChevronFirst className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Previous Opening Move"
                onClick={handleStepBack}
                disabled={currentPly === 0}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Next Opening Move"
                onClick={handleStepForward}
                disabled={currentPly >= selectedOpening.moves.length}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Opening End"
                onClick={() => updateBoardToPly(selectedOpening, selectedOpening.moves.length)}
                disabled={currentPly >= selectedOpening.moves.length}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 disabled:opacity-30"
              >
                <ChevronLast className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Theory, Win Rates, Traps & AI Tutor */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-md space-y-4">
            <div>
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                ECO {selectedOpening.eco}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                {selectedOpening.name}
              </h2>
              <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
                {selectedOpening.description}
              </p>
            </div>

            {/* Win Rate Stats Bar */}
            <div className="space-y-1.5 pt-2 border-t border-neutral-800">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1 font-semibold text-white">
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-400" /> Master Statistics
                </span>
                <span>
                  White {selectedOpening.whiteWinRate}% | Draw {selectedOpening.drawRate}% | Black {selectedOpening.blackWinRate}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-neutral-800">
                <div
                  style={{ width: `${selectedOpening.whiteWinRate}%` }}
                  className="bg-emerald-400 h-full"
                  title="White Win"
                />
                <div
                  style={{ width: `${selectedOpening.drawRate}%` }}
                  className="bg-neutral-500 h-full"
                  title="Draw"
                />
                <div
                  style={{ width: `${selectedOpening.blackWinRate}%` }}
                  className="bg-rose-500 h-full"
                  title="Black Win"
                />
              </div>
            </div>

            {/* Key Ideas */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Core Strategic Plans</span>
              </h4>
              <ul className="space-y-1.5 text-xs text-neutral-300">
                {selectedOpening.keyIdeas.map((idea, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Traps & Tricks */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Tactical Traps & Warnings</span>
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
                speechBubble:
                  practiceStatus ||
                  selectedOpening.description,
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
