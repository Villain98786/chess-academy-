import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { BoardTheme } from '../../types/chess';
import { MoveClassification } from '../../services/analytics';
import { ChessPieceIcon } from './ChessPieces';
import { soundManager } from '../../services/sound';

interface ChessboardProps {
  chess: Chess;
  orientation?: Color;
  theme?: BoardTheme;
  showCoordinates?: boolean;
  showLegalMoves?: boolean;
  autoQueen?: boolean;
  interactive?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  hintMove?: { from: Square; to: Square } | null;
  bestMove?: { from: Square; to: Square } | null;
  threatMove?: { from: Square; to: Square } | null;
  lastMoveClassification?: MoveClassification | null;
  onMove?: (move: { from: Square; to: Square; promotion?: PieceSymbol }) => void;
  className?: string;
}

const THEME_COLORS: Record<BoardTheme, { light: string; dark: string; border: string }> = {
  emerald: {
    light: '#ebecd0',
    dark: '#739552',
    border: '#384d26',
  },
  wood: {
    light: '#f0d9b5',
    dark: '#b58863',
    border: '#684226',
  },
  midnight: {
    light: '#c4d1de',
    dark: '#4d607a',
    border: '#273344',
  },
  cyber: {
    light: '#a2e2c4',
    dark: '#1b4d3e',
    border: '#0d2820',
  },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const FILES_REV = [...FILES].reverse();
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
const RANKS_REV = [...RANKS].reverse();

function getClassificationBadgeStyle(classification?: MoveClassification | null): {
  symbol: string;
  bg: string;
} | null {
  switch (classification) {
    case 'brilliant':
      return { symbol: '!!', bg: 'bg-cyan-500 text-neutral-950 border-white' };
    case 'great':
      return { symbol: '!', bg: 'bg-sky-500 text-neutral-950 border-white' };
    case 'best':
      return { symbol: '★', bg: 'bg-emerald-500 text-neutral-950 border-white' };
    case 'excellent':
      return { symbol: '✓', bg: 'bg-teal-400 text-neutral-950 border-white' };
    case 'good':
      return { symbol: '👍', bg: 'bg-green-500 text-neutral-950 border-white' };
    case 'inaccuracy':
      return { symbol: '?!', bg: 'bg-amber-400 text-neutral-950 border-white' };
    case 'missed_win':
      return { symbol: '⚡', bg: 'bg-yellow-400 text-neutral-950 border-white' };
    case 'mistake':
      return { symbol: '?', bg: 'bg-orange-500 text-white border-white' };
    case 'blunder':
      return { symbol: '??', bg: 'bg-rose-600 text-white border-white' };
    default:
      return null;
  }
}

interface BoardSquareProps {
  square: Square;
  file: string;
  rank: string;
  showRankLabel: boolean;
  showFileLabel: boolean;
  isLight: boolean;
  squareBg: string;
  pieceType?: PieceSymbol;
  pieceColor?: Color;
  canDragPiece: boolean;
  isDraggingThis: boolean;
  isCheckSquare: boolean;
  isCaptureBurst: boolean;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  isLegalTarget: boolean;
  isCaptureTarget: boolean;
  badgeSymbol?: string;
  badgeBg?: string;
  onSquareClick: (sq: Square) => void;
  onMouseDown: (e: React.MouseEvent, sq: Square) => void;
  onMouseUp: (e: React.MouseEvent, sq: Square) => void;
  onDragStart: (e: React.DragEvent, sq: Square) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, sq: Square) => void;
  registerPieceRef: (sq: Square, el: HTMLDivElement | null) => void;
}

const MemoizedBoardSquare = React.memo<BoardSquareProps>(
  ({
    square,
    file,
    rank,
    showRankLabel,
    showFileLabel,
    isLight,
    squareBg,
    pieceType,
    pieceColor,
    canDragPiece,
    isDraggingThis,
    isCheckSquare,
    isCaptureBurst,
    showCoordinates,
    showLegalMoves,
    isLegalTarget,
    isCaptureTarget,
    badgeSymbol,
    badgeBg,
    onSquareClick,
    onMouseDown,
    onMouseUp,
    onDragStart,
    onDragOver,
    onDrop,
    registerPieceRef,
  }) => {
    return (
      <div
        data-square={square}
        onClick={() => onSquareClick(square)}
        onMouseDown={(e) => onMouseDown(e, square)}
        onMouseUp={(e) => onMouseUp(e, square)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, square)}
        className="relative flex items-center justify-center cursor-pointer transition-colors duration-150 touch-none select-none"
        style={{ backgroundColor: squareBg }}
      >
        {/* Check Radial Glow */}
        {isCheckSquare && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{
              background:
                'radial-gradient(circle, rgba(239,68,68,0.85) 0%, rgba(220,38,38,0.5) 60%, transparent 100%)',
            }}
          />
        )}

        {/* Capture Shockwave Burst */}
        {isCaptureBurst && (
          <div className="absolute inset-1 rounded-full border-4 border-emerald-400/80 animate-ping pointer-events-none z-20" />
        )}

        {/* Board Coordinates */}
        {showCoordinates && (
          <>
            {showRankLabel && (
              <span
                className={`absolute top-0.5 left-1 text-[10px] sm:text-[11px] font-extrabold leading-none pointer-events-none ${
                  isLight ? 'text-neutral-800/70' : 'text-neutral-100/80'
                }`}
              >
                {rank}
              </span>
            )}
            {showFileLabel && (
              <span
                className={`absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-extrabold leading-none pointer-events-none ${
                  isLight ? 'text-neutral-800/70' : 'text-neutral-100/80'
                }`}
              >
                {file}
              </span>
            )}
          </>
        )}

        {/* Legal Move Indicators */}
        {showLegalMoves && isLegalTarget && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {isCaptureTarget ? (
              <div className="w-[84%] h-[84%] rounded-full border-[5px] border-black/25 transition-transform duration-150 scale-100 hover:scale-105" />
            ) : (
              <div className="w-[30%] h-[30%] rounded-full bg-black/22 transition-transform duration-150" />
            )}
          </div>
        )}

        {/* Floating Move Classification Badge on Destination Square */}
        {badgeSymbol && badgeBg && (
          <div
            className={`absolute -top-0.5 -right-0.5 z-30 w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border-2 flex items-center justify-center text-[10px] font-black shadow-md animate-in zoom-in-75 duration-200 pointer-events-none ${badgeBg}`}
          >
            {badgeSymbol}
          </div>
        )}

        {/* Chess Piece */}
        {pieceType && pieceColor && (
          <div
            ref={(el) => registerPieceRef(square, el)}
            draggable={canDragPiece}
            onDragStart={(e) => onDragStart(e, square)}
            className={`w-[86%] h-[86%] z-10 transition-transform duration-150 ${
              canDragPiece ? 'cursor-grab active:cursor-grabbing hover:scale-105' : ''
            } ${isDraggingThis ? 'opacity-35 scale-95' : 'opacity-100'}`}
          >
            <ChessPieceIcon type={pieceType} color={pieceColor} />
          </div>
        )}
      </div>
    );
  }
);
MemoizedBoardSquare.displayName = 'MemoizedBoardSquare';

export const Chessboard: React.FC<ChessboardProps> = React.memo(
  ({
    chess,
    orientation = 'w',
    theme = 'emerald',
    showCoordinates = true,
    showLegalMoves = true,
    autoQueen = true,
    interactive = true,
    lastMove = null,
    hintMove = null,
    bestMove = null,
    threatMove = null,
    lastMoveClassification = null,
    onMove,
    className = '',
  }) => {
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Move[]>([]);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(
      null
    );

    // Drag and Right-click tactical annotation state
    const [draggingSquare, setDraggingSquare] = useState<Square | null>(null);
    const rightClickStartRef = useRef<Square | null>(null);
    const [userArrows, setUserArrows] = useState<{ from: Square; to: Square }[]>([]);
    const [markedSquares, setMarkedSquares] = useState<Square[]>([]);
    const [captureBurstSquare, setCaptureBurstSquare] = useState<Square | null>(null);

    const boardRef = useRef<HTMLDivElement>(null);
    const pieceRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const prevLastMoveRef = useRef<string>('');

    const colors = THEME_COLORS[theme] || THEME_COLORS.emerald;
    const files = orientation === 'w' ? FILES : FILES_REV;
    const ranks = orientation === 'w' ? RANKS : RANKS_REV;
    const currentFen = chess.fen();

    const registerPieceRef = useCallback((sq: Square, el: HTMLDivElement | null) => {
      pieceRefs.current[sq] = el;
    }, []);

    // Convert square e.g. "e4" to (colIndex 0..7, rowIndex 0..7) in current orientation
    const squareToGridCoords = useCallback(
      (sq: Square): { col: number; row: number } => {
        const fileChar = sq[0];
        const rankChar = sq[1];
        const col = files.indexOf(fileChar);
        const row = ranks.indexOf(rankChar);
        return { col, row };
      },
      [files, ranks]
    );

    // Smooth FLIP sliding animation whenever lastMove changes
    useEffect(() => {
      if (!lastMove) return;
      const moveKey = `${lastMove.from}-${lastMove.to}-${currentFen}`;
      if (prevLastMoveRef.current === moveKey) return;
      prevLastMoveRef.current = moveKey;

      const fromCoords = squareToGridCoords(lastMove.from);
      const toCoords = squareToGridCoords(lastMove.to);
      const dxPercent = (fromCoords.col - toCoords.col) * 100;
      const dyPercent = (fromCoords.row - toCoords.row) * 100;

      const targetEl = pieceRefs.current[lastMove.to];
      if (targetEl && typeof targetEl.animate === 'function') {
        targetEl.animate(
          [
            { transform: `translate(${dxPercent}%, ${dyPercent}%) scale(1.08)` },
            { transform: 'translate(0%, 0%) scale(1)' },
          ],
          {
            duration: 210,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }
        );
      }
    }, [lastMove, currentFen, squareToGridCoords]);

    // Find King in check square
    const inCheckSquare: Square | null = useMemo(() => {
      if (!chess.inCheck()) return null;
      const turn = chess.turn();
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === turn) {
            return `${FILES[c]}${8 - r}` as Square;
          }
        }
      }
      return null;
    }, [chess, currentFen]);

    // Update legal moves whenever selected square changes
    useEffect(() => {
      if (!selectedSquare || !interactive) {
        setLegalMoves([]);
        return;
      }
      const moves = chess.moves({ square: selectedSquare, verbose: true });
      setLegalMoves(moves);
    }, [selectedSquare, chess, currentFen, interactive]);

    // Fast lookup map for legal target squares
    const legalTargetMap = useMemo(() => {
      const map = new Map<Square, Move>();
      for (const m of legalMoves) {
        map.set(m.to as Square, m);
      }
      return map;
    }, [legalMoves]);

    // Execute a move
    const handleExecuteMove = useCallback(
      (from: Square, to: Square, promotion?: PieceSymbol) => {
        const moves = chess.moves({ square: from, verbose: true });
        const targetMove = moves.find((m) => m.to === to);

        if (!targetMove) {
          setSelectedSquare(null);
          setDraggingSquare(null);
          return;
        }

        const piece = chess.get(from);
        const isPawnPromotion =
          piece?.type === 'p' &&
          ((piece.color === 'w' && to.endsWith('8')) ||
            (piece.color === 'b' && to.endsWith('1')));

        if (isPawnPromotion && !promotion) {
          if (autoQueen) {
            promotion = 'q';
          } else {
            setPendingPromotion({ from, to });
            return;
          }
        }

        try {
          const isCapture = Boolean(targetMove.captured);
          const isCastle = targetMove.san.includes('O-O');

          if (isCapture) {
            setCaptureBurstSquare(to);
            setTimeout(() => setCaptureBurstSquare(null), 380);
          }

          setUserArrows([]);
          setMarkedSquares([]);

          if (onMove) {
            onMove({ from, to, promotion });
          }

          if (chess.inCheck()) {
            soundManager.playCheck();
          } else if (isCastle) {
            soundManager.playCastle();
          } else if (isCapture) {
            soundManager.playCapture();
          } else {
            soundManager.playMove();
          }
        } catch (err) {
          console.error('Error executing move:', err);
        } finally {
          setSelectedSquare(null);
          setDraggingSquare(null);
          setPendingPromotion(null);
        }
      },
      [chess, autoQueen, onMove]
    );

    // Handle Square Click
    const handleSquareClick = useCallback(
      (square: Square) => {
        setUserArrows((prev) => (prev.length > 0 ? [] : prev));
        setMarkedSquares((prev) => (prev.length > 0 ? [] : prev));

        if (!interactive || pendingPromotion) return;

        const piece = chess.get(square);

        if (selectedSquare) {
          if (selectedSquare === square) {
            setSelectedSquare(null);
            return;
          }

          if (legalTargetMap.has(square)) {
            handleExecuteMove(selectedSquare, square);
            return;
          }

          if (piece && piece.color === chess.turn()) {
            setSelectedSquare(square);
            return;
          }

          setSelectedSquare(null);
          return;
        }

        if (piece && piece.color === chess.turn()) {
          setSelectedSquare(square);
        }
      },
      [interactive, pendingPromotion, chess, selectedSquare, legalTargetMap, handleExecuteMove]
    );

    // Right-click tactical arrows and square markers
    const handleMouseDown = useCallback((e: React.MouseEvent, square: Square) => {
      if (e.button === 2) {
        rightClickStartRef.current = square;
      }
    }, []);

    const handleMouseUp = useCallback((e: React.MouseEvent, square: Square) => {
      const startSq = rightClickStartRef.current;
      if (e.button === 2 && startSq) {
        if (startSq === square) {
          setMarkedSquares((prev) =>
            prev.includes(square) ? prev.filter((s) => s !== square) : [...prev, square]
          );
        } else {
          const newArrow = { from: startSq, to: square };
          setUserArrows((prev) => {
            const exists = prev.some((a) => a.from === newArrow.from && a.to === newArrow.to);
            return exists
              ? prev.filter((a) => !(a.from === newArrow.from && a.to === newArrow.to))
              : [...prev, newArrow];
          });
        }
        rightClickStartRef.current = null;
      }
    }, []);

    // Drag and Drop handlers
    const handleDragStart = useCallback(
      (e: React.DragEvent, square: Square) => {
        if (!interactive || pendingPromotion) {
          e.preventDefault();
          return;
        }
        const piece = chess.get(square);
        if (!piece || piece.color !== chess.turn()) {
          e.preventDefault();
          return;
        }
        setDraggingSquare(square);
        setSelectedSquare(square);
        e.dataTransfer.setData('text/plain', square);
        e.dataTransfer.effectAllowed = 'move';
      },
      [interactive, pendingPromotion, chess]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent, targetSquare: Square) => {
        e.preventDefault();
        const sourceSquare =
          (e.dataTransfer.getData('text/plain') as Square) || draggingSquare;
        if (sourceSquare && sourceSquare !== targetSquare) {
          handleExecuteMove(sourceSquare, targetSquare);
        }
        setDraggingSquare(null);
      },
      [draggingSquare, handleExecuteMove]
    );

    // Helper to compute SVG arrow coordinates (in 0..800 space)
    const computeArrowPoints = useCallback(
      (from: Square, to: Square) => {
        const f = squareToGridCoords(from);
        const t = squareToGridCoords(to);
        const x1 = f.col * 100 + 50;
        const y1 = f.row * 100 + 50;
        const x2 = t.col * 100 + 50;
        const y2 = t.row * 100 + 50;

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const endX = x2 - Math.cos(angle) * 22;
        const endY = y2 - Math.sin(angle) * 22;
        return { x1, y1, endX, endY };
      },
      [squareToGridCoords]
    );

    const badgeStyle = getClassificationBadgeStyle(lastMoveClassification);
    const currentTurn = chess.turn();

    return (
      <div
        className={`relative inline-block w-full max-w-[560px] aspect-square select-none touch-none ${className}`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Promotion Choice Modal */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-40 bg-black/65 backdrop-blur-xs flex items-center justify-center rounded-xl p-4 animate-in fade-in duration-150">
            <div className="bg-neutral-900 border border-emerald-500/50 p-4 rounded-2xl shadow-2xl text-center space-y-3">
              <h4 className="text-sm font-bold text-emerald-400">Promote Pawn</h4>
              <div className="flex gap-2 justify-center">
                {(['q', 'n', 'r', 'b'] as PieceSymbol[]).map((pType) => (
                  <button
                    key={pType}
                    type="button"
                    onClick={() =>
                      handleExecuteMove(pendingPromotion.from, pendingPromotion.to, pType)
                    }
                    className="w-13 h-13 p-1.5 rounded-xl bg-neutral-800 hover:bg-emerald-600 transition-all hover:scale-110 shadow border border-neutral-700 hover:border-emerald-400"
                  >
                    <ChessPieceIcon type={pType} color={currentTurn} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Board Container */}
        <div
          ref={boardRef}
          data-testid="chessboard-grid"
          className="relative grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl shadow-2xl overflow-hidden border-[3px] touch-none select-none"
          style={{ borderColor: colors.border }}
        >
          {ranks.map((rank, rankIdx) =>
            files.map((file, fileIdx) => {
              const square = `${file}${rank}` as Square;
              const isLight = (rankIdx + fileIdx) % 2 === 0;
              const piece = chess.get(square);

              const isSelected = selectedSquare === square;
              const isLastMoveFrom = lastMove?.from === square;
              const isLastMoveTo = lastMove?.to === square;
              const isCheckSquare = inCheckSquare === square;
              const isHint = hintMove?.from === square || hintMove?.to === square;
              const isMarked = markedSquares.includes(square);
              const isCaptureBurst = captureBurstSquare === square;

              const legalMove = legalTargetMap.get(square);
              const isLegalTarget = Boolean(legalMove);
              const isCaptureTarget = isLegalTarget && Boolean(piece || legalMove?.captured);

              let squareBg = isLight ? colors.light : colors.dark;
              if (isSelected) {
                squareBg = '#f5f676';
              } else if (isMarked) {
                squareBg = isLight ? '#f48fb1' : '#d81b60';
              } else if (isLastMoveFrom || isLastMoveTo) {
                squareBg = isLight ? '#d6e37a' : '#b2be42';
              } else if (isHint) {
                squareBg = isLight ? '#81c784' : '#4caf50';
              }

              return (
                <MemoizedBoardSquare
                  key={square}
                  square={square}
                  file={file}
                  rank={rank}
                  showRankLabel={fileIdx === 0}
                  showFileLabel={rankIdx === 7}
                  isLight={isLight}
                  squareBg={squareBg}
                  pieceType={piece?.type}
                  pieceColor={piece?.color}
                  canDragPiece={Boolean(interactive && piece && piece.color === currentTurn)}
                  isDraggingThis={draggingSquare === square}
                  isCheckSquare={isCheckSquare}
                  isCaptureBurst={isCaptureBurst}
                  showCoordinates={showCoordinates}
                  showLegalMoves={showLegalMoves}
                  isLegalTarget={isLegalTarget}
                  isCaptureTarget={isCaptureTarget}
                  badgeSymbol={isLastMoveTo ? badgeStyle?.symbol : undefined}
                  badgeBg={isLastMoveTo ? badgeStyle?.bg : undefined}
                  onSquareClick={handleSquareClick}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  registerPieceRef={registerPieceRef}
                />
              );
            })
          )}

          {/* SVG Tactical Arrows Overlay (Hint, Best Move, Threat Move, and User Right-Click Arrows) */}
          <svg
            viewBox="0 0 800 800"
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          >
            <defs>
              <marker
                id="arrow-emerald"
                markerWidth="4.5"
                markerHeight="4.5"
                refX="2.6"
                refY="2.25"
                orient="auto"
              >
                <polygon points="0 0, 4.5 2.25, 0 4.5" fill="rgba(16, 185, 129, 0.9)" />
              </marker>
              <marker
                id="arrow-amber"
                markerWidth="4.5"
                markerHeight="4.5"
                refX="2.6"
                refY="2.25"
                orient="auto"
              >
                <polygon points="0 0, 4.5 2.25, 0 4.5" fill="rgba(245, 158, 11, 0.9)" />
              </marker>
              <marker
                id="arrow-cyan"
                markerWidth="4.5"
                markerHeight="4.5"
                refX="2.6"
                refY="2.25"
                orient="auto"
              >
                <polygon points="0 0, 4.5 2.25, 0 4.5" fill="rgba(6, 182, 212, 0.85)" />
              </marker>
              <marker
                id="arrow-crimson"
                markerWidth="4.5"
                markerHeight="4.5"
                refX="2.6"
                refY="2.25"
                orient="auto"
              >
                <polygon points="0 0, 4.5 2.25, 0 4.5" fill="rgba(244, 63, 94, 0.88)" />
              </marker>
            </defs>

            {/* Opponent Threat Arrow (Red/Crimson) */}
            {threatMove &&
              (() => {
                const pts = computeArrowPoints(threatMove.from, threatMove.to);
                return (
                  <line
                    x1={pts.x1}
                    y1={pts.y1}
                    x2={pts.endX}
                    y2={pts.endY}
                    stroke="rgba(244, 63, 94, 0.82)"
                    strokeWidth="15"
                    strokeLinecap="round"
                    strokeDasharray="18 10"
                    markerEnd="url(#arrow-crimson)"
                  />
                );
              })()}

            {/* Engine Best Move Recommendation Arrow */}
            {bestMove &&
              (() => {
                const pts = computeArrowPoints(bestMove.from, bestMove.to);
                return (
                  <line
                    x1={pts.x1}
                    y1={pts.y1}
                    x2={pts.endX}
                    y2={pts.endY}
                    stroke="rgba(6, 182, 212, 0.82)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray="22 10"
                    markerEnd="url(#arrow-cyan)"
                  />
                );
              })()}

            {/* Coaching Hint Arrow */}
            {hintMove &&
              (() => {
                const pts = computeArrowPoints(hintMove.from, hintMove.to);
                return (
                  <line
                    x1={pts.x1}
                    y1={pts.y1}
                    x2={pts.endX}
                    y2={pts.endY}
                    stroke="rgba(16, 185, 129, 0.9)"
                    strokeWidth="18"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-emerald)"
                  />
                );
              })()}

            {/* User Right-Click Drawn Tactical Arrows */}
            {userArrows.map((arr, idx) => {
              const pts = computeArrowPoints(arr.from, arr.to);
              return (
                <line
                  key={idx}
                  x1={pts.x1}
                  y1={pts.y1}
                  x2={pts.endX}
                  y2={pts.endY}
                  stroke="rgba(245, 158, 11, 0.88)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  markerEnd="url(#arrow-amber)"
                />
              );
            })}
          </svg>
        </div>
      </div>
    );
  }
);
Chessboard.displayName = 'Chessboard';
