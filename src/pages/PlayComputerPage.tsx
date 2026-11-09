import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import confetti from 'canvas-confetti';
import {
  AppSettings,
  AssistanceSettings,
  CoachExplanation,
  CoachHintLevel,
  CourseLevelId,
  EngineDifficulty,
  EngineSpeedMode,
  EngineTelemetry,
  GameMove,
  GameRecord,
  TimeControlConfig,
  TurnState,
  UserStats,
} from '../types/chess';
import { DIFFICULTY_LEVELS, chessEngine } from '../services/engine';
import {
  generateInstantMoveAnalysis,
  InstantMoveFeedback,
  calculateColorAccuracy,
  identifyOpeningFromMoves,
  generatePgnFromMoves,
} from '../services/analytics';
import { grandmasterCoach } from '../services/grandmasterCoachService';
import { coachVoiceService } from '../services/coachVoiceService';
import {
  generateStructuredGameReview,
  StructuredGameReview,
} from '../services/gameReviewService';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { EvalBar } from '../components/Chessboard/EvalBar';
import { CapturedPieces } from '../components/Chessboard/CapturedPieces';
import { MoveHistory } from '../components/Chessboard/MoveHistory';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { StorageService } from '../services/storage';
import { soundManager } from '../services/sound';
import { NavPage } from '../components/Navigation/Sidebar';
import {
  RotateCcw,
  Flag,
  Handshake,
  Clock,
  RefreshCw,
  LineChart,
  Lightbulb,
  Activity,
  Shuffle,
  ArrowUpDown,
  Repeat,
  Copy,
  Check,
  Upload,
  Save,
  Sliders,
  Cpu,
  Gauge,
} from 'lucide-react';

interface PlayComputerPageProps {
  settings: AppSettings;
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  onNavigate: (page: NavPage, context?: unknown) => void;
  initialDifficulty?: EngineDifficulty;
}

export const TIME_CONTROL_PRESETS: TimeControlConfig[] = [
  { id: 'none', label: '∞ No Timer', category: 'none', minutes: 0, incrementSeconds: 0 },
  { id: 'bullet-1-0', label: '🔫 1+0 Bullet', category: 'bullet', minutes: 1, incrementSeconds: 0 },
  { id: 'bullet-2-1', label: '🔫 2+1 Bullet', category: 'bullet', minutes: 2, incrementSeconds: 1 },
  { id: 'blitz-3-0', label: '⚡ 3+0 Blitz', category: 'blitz', minutes: 3, incrementSeconds: 0 },
  { id: 'blitz-3-2', label: '⚡ 3+2 Blitz', category: 'blitz', minutes: 3, incrementSeconds: 2 },
  { id: 'blitz-5-0', label: '🔥 5+0 Blitz', category: 'blitz', minutes: 5, incrementSeconds: 0 },
  { id: 'rapid-10-0', label: '⏱️ 10+0 Rapid', category: 'rapid', minutes: 10, incrementSeconds: 0 },
  { id: 'rapid-15-10', label: '⏱️ 15+10 Rapid', category: 'rapid', minutes: 15, incrementSeconds: 10 },
  { id: 'custom', label: '⚙️ Custom Time...', category: 'custom', minutes: 10, incrementSeconds: 5 },
];

export const PlayComputerPage: React.FC<PlayComputerPageProps> = ({
  settings,
  stats,
  onUpdateStats,
  onNavigate,
  initialDifficulty,
}) => {
  // Game Setup & Engine Configuration State
  const [difficulty, setDifficulty] = useState<EngineDifficulty>(
    initialDifficulty && DIFFICULTY_LEVELS[initialDifficulty] ? initialDifficulty : 'intermediate'
  );
  const [speedMode, setSpeedMode] = useState<EngineSpeedMode>('balanced');
  const [playerColor, setPlayerColor] = useState<Color>('w');
  const [boardOrientation, setBoardOrientation] = useState<Color>('w');
  const [timeControl, setTimeControl] = useState<TimeControlConfig>(TIME_CONTROL_PRESETS[6]); // 10+0 Rapid
  const [showCustomTimeModal, setShowCustomTimeModal] = useState<boolean>(false);
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customIncrement, setCustomIncrement] = useState<number>(5);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [turnState, setTurnState] = useState<TurnState>('your_turn');

  // Independently Configurable Computer Assistance Settings (Phase 6B)
  const [assistance, setAssistance] = useState<AssistanceSettings>(() => ({
    hintsEnabled: true,
    bestMoveArrow: true,
    threatArrows: false,
    evalBar: settings.showEvalBar,
    moveFeedback: true,
    thinkingIndicator: true,
    engineAnalysisPanel: false,
    takebacksAllowed: true,
  }));
  const [showAssistancePanel, setShowAssistancePanel] = useState<boolean>(false);

  // Active Chess Match State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [displayChess, setDisplayChess] = useState<Chess>(() => new Chess());
  const [moves, setMoves] = useState<GameMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [threatMove, setThreatMove] = useState<{ from: Square; to: Square; san?: string } | null>(
    null
  );
  const [evalScore, setEvalScore] = useState<number>(0);
  const [isEngineThinking, setIsEngineThinking] = useState<boolean>(false);
  const [liveFeedback, setLiveFeedback] = useState<InstantMoveFeedback | null>(null);
  const [coachExplanation, setCoachExplanation] = useState<CoachExplanation>(() =>
    grandmasterCoach.createInitialState(
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'w'
    )
  );
  const [hintStage, setHintStage] = useState<CoachHintLevel>(1);
  const lastUserCoachRef = useRef<CoachExplanation | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<EngineTelemetry>(() =>
    chessEngine.getLastTelemetry()
  );

  // FEN Import / PGN Copy UI State
  const [showFenImport, setShowFenImport] = useState<boolean>(false);
  const [fenImportInput, setFenImportInput] = useState<string>('');
  const [copiedType, setCopiedType] = useState<'pgn' | 'fen' | 'saved' | null>(null);

  // Timestamp-based Chess Clocks (milliseconds remaining)
  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(10 * 60 * 1000);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(10 * 60 * 1000);
  const whiteTimeMsRef = useRef<number>(10 * 60 * 1000);
  const blackTimeMsRef = useRef<number>(10 * 60 * 1000);
  const lastClockTickRef = useRef<number>(performance.now());

  // Refs for race-free engine callbacks
  const gameSessionIdRef = useRef<number>(1);
  const chessRef = useRef<Chess>(chess);
  chessRef.current = chess;
  const playerColorRef = useRef<Color>(playerColor);
  playerColorRef.current = playerColor;
  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;
  const movesRef = useRef<GameMove[]>([]);
  movesRef.current = moves;

  // Game Result Modal
  const [gameResult, setGameResult] = useState<{
    result: 'win' | 'loss' | 'draw';
    reason: string;
    gameRecord?: GameRecord;
    review?: StructuredGameReview;
  } | null>(null);

  const activeDifficulty = DIFFICULTY_LEVELS[difficulty];
  const currentOpening = useMemo(() => identifyOpeningFromMoves(moves), [moves]);

  // Subscribe to real-time Web Worker telemetry
  useEffect(() => {
    const unsubscribe = chessEngine.onTelemetry((t) => {
      setTelemetry(t);
    });
    return () => {
      unsubscribe();
      chessEngine.stop();
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => {
      setStatusNotice((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Finalize and record game
  const finishGame = useCallback(
    (result: 'win' | 'loss' | 'draw', reason: string, finalMovesList?: GameMove[]) => {
      chessEngine.stop();
      const recordedMoves = finalMovesList || movesRef.current;
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsEngineThinking(false);
      setTurnState('game_over');
      soundManager.playGameOver(result === 'win');

      if (result === 'win') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }

      const userAcc = calculateColorAccuracy(recordedMoves, playerColorRef.current);
      const oppAcc = calculateColorAccuracy(
        recordedMoves,
        playerColorRef.current === 'w' ? 'b' : 'w'
      );
      const opening = identifyOpeningFromMoves(recordedMoves);
      const pgn = generatePgnFromMoves(recordedMoves, {
        white: playerColorRef.current === 'w' ? 'Player' : activeDifficulty.name,
        black: playerColorRef.current === 'b' ? 'Player' : activeDifficulty.name,
        result,
        playerColor: playerColorRef.current,
        opening: `${opening.eco} ${opening.name}`,
      });

      const gameRecord: GameRecord = {
        id: `game-${Date.now()}`,
        date: 'Just now',
        playerColor: playerColorRef.current,
        opponent: activeDifficulty.name,
        opponentElo: activeDifficulty.elo,
        result,
        reason,
        moves: [...recordedMoves],
        userAccuracy: userAcc,
        opponentAccuracy: oppAcc,
        initialTimeMinutes: timeControl.minutes,
        incrementSeconds: timeControl.incrementSeconds,
        openingName: opening.name,
        openingEco: opening.eco,
        pgn,
      };

      const updatedStats = StorageService.recordGame(gameRecord);
      onUpdateStats(updatedStats);

      const review = generateStructuredGameReview({
        moves: recordedMoves,
        playerColor: playerColorRef.current,
        result,
        reason,
      });

      setGameResult({ result, reason, gameRecord, review });
    },
    [activeDifficulty, timeControl, onUpdateStats]
  );

  // Check checkmate, draw, stalemate
  const checkGameTermination = useCallback(
    (currentChess: Chess, updatedMoves: GameMove[]) => {
      if (currentChess.isCheckmate()) {
        const winner = currentChess.turn() === 'w' ? 'b' : 'w';
        const isPlayerWin = winner === playerColorRef.current;
        finishGame(isPlayerWin ? 'win' : 'loss', 'Checkmate', updatedMoves);
        return true;
      } else if (currentChess.isDraw()) {
        let reason = 'Draw';
        if (currentChess.isStalemate()) reason = 'Stalemate';
        else if (currentChess.isThreefoldRepetition()) reason = 'Threefold Repetition';
        else if (currentChess.isInsufficientMaterial()) reason = 'Insufficient Material';
        finishGame('draw', reason, updatedMoves);
        return true;
      }
      return false;
    },
    [finishGame]
  );

  // Computer Engine Move Execution (Asynchronous via Web Worker)
  const makeEngineMove = useCallback(
    async (
      currentChess: Chess,
      currentMoves: GameMove[],
      diff: EngineDifficulty = difficulty,
      speed: EngineSpeedMode = speedMode
    ) => {
      if (currentChess.isGameOver() || !isPlayingRef.current) return;

      const sessionAtStart = gameSessionIdRef.current;
      const expectedFen = currentChess.fen();

      setIsEngineThinking(true);
      setTurnState('computer_thinking');

      try {
        const prevScore = chessEngine.evaluatePosition(currentChess);
        const bestMove = await chessEngine.getBestMove(currentChess, diff, {
          speedMode: speed,
        });

        // Guard against stale responses after New Game, Undo, Resign, or Switch Sides
        if (
          !bestMove ||
          sessionAtStart !== gameSessionIdRef.current ||
          !isPlayingRef.current ||
          chessRef.current.fen() !== expectedFen
        ) {
          return;
        }

        setTurnState('computer_moving');

        const fenBefore = currentChess.fen();
        const piece = currentChess.get(bestMove.from);
        const targetPiece = currentChess.get(bestMove.to);
        const res = currentChess.move({
          from: bestMove.from,
          to: bestMove.to,
          promotion: (bestMove.promotion as PieceSymbol) || 'q',
        });

        if (res) {
          // Add increment to computer's clock
          if (timeControl.minutes > 0 && timeControl.incrementSeconds > 0) {
            const incMs = timeControl.incrementSeconds * 1000;
            if (piece?.color === 'w') {
              whiteTimeMsRef.current += incMs;
              setWhiteTimeMs(whiteTimeMsRef.current);
            } else {
              blackTimeMsRef.current += incMs;
              setBlackTimeMs(blackTimeMsRef.current);
            }
          }
          lastClockTickRef.current = performance.now();

          const newChess = new Chess(currentChess.fen());
          chessRef.current = newChess;
          setChess(newChess);
          setDisplayChess(newChess);
          setLastMove({ from: bestMove.from, to: bestMove.to });
          setHintMove(null);

          // Update opponent threat arrow if enabled
          if (assistance.threatArrows) {
            const threat = chessEngine.detectOpponentThreat(newChess.fen());
            setThreatMove(threat);
          } else {
            setThreatMove(null);
          }

          if (newChess.inCheck()) {
            soundManager.playCheck();
          } else if (res.san.includes('O-O')) {
            soundManager.playCastle();
          } else if (res.captured) {
            soundManager.playCapture();
          } else {
            soundManager.playMove();
          }

          const newScore = chessEngine.evaluatePosition(newChess);
          setEvalScore(newScore);

          const engineFeedback = generateInstantMoveAnalysis({
            fenBefore,
            fenAfter: newChess.fen(),
            san: res.san,
            from: bestMove.from,
            to: bestMove.to,
            moverColor: piece?.color || 'b',
            prevEvalWhiteCp: prevScore,
            newEvalWhiteCp: newScore,
            bestMoveFrom: bestMove.from,
            bestMoveTo: bestMove.to,
          });

          const engineGameMove: GameMove = {
            from: bestMove.from,
            to: bestMove.to,
            san: res.san,
            piece: piece?.type || 'p',
            color: piece?.color || 'b',
            captured: targetPiece?.type,
            fen: newChess.fen(),
            evalScore: newScore,
            classification: engineFeedback.classification,
            pv: bestMove.telemetry?.pv,
          };

          const nextMoves = [...currentMoves, engineGameMove];
          setMoves(nextMoves);
          setCurrentMoveIndex(nextMoves.length - 1);

          // Live Coaching During Opponent Moves (PART 7)
          const oppCoachExp = grandmasterCoach.analyzeOpponentMove({
            fenBefore,
            fenAfter: newChess.fen(),
            san: res.san,
            from: bestMove.from,
            to: bestMove.to,
            opponentColor: piece?.color || 'b',
            evalWhiteCp: newScore,
            moveCount: nextMoves.length,
          });

          const prevUserCoach = lastUserCoachRef.current;
          if (
            prevUserCoach &&
            prevUserCoach.moveCount === currentMoves.length &&
            oppCoachExp.state !== 'WARNING'
          ) {
            // Preserve user's move praise/feedback in headline & badge while adding opponent's move explanation
            setCoachExplanation({
              ...prevUserCoach,
              id: `${prevUserCoach.id}-${oppCoachExp.id}`,
              speechBubble: `${prevUserCoach.speechBubble} Opponent replied ${res.san}: ${oppCoachExp.speechBubble}`,
              detailedExplanation: `${prevUserCoach.detailedExplanation} (${oppCoachExp.detailedExplanation})`,
              fen: newChess.fen(),
              moveCount: nextMoves.length,
            });
          } else if (prevUserCoach && oppCoachExp.state === 'WARNING') {
            setCoachExplanation({
              ...oppCoachExp,
              detailedExplanation: `Your previous move (${prevUserCoach.moveSan || ''}): ${
                prevUserCoach.speechBubble
              } • ${oppCoachExp.detailedExplanation}`,
            });
          } else {
            setCoachExplanation(oppCoachExp);
          }

          const ended = checkGameTermination(newChess, nextMoves);
          if (!ended) {
            setTurnState('your_turn');
          }
        }
      } catch (err) {
        console.error('Engine move error:', err);
        if (isPlayingRef.current) {
          setTurnState('your_turn');
        }
      } finally {
        if (sessionAtStart === gameSessionIdRef.current) {
          setIsEngineThinking(false);
        }
      }
    },
    [difficulty, speedMode, timeControl, assistance.threatArrows, checkGameTermination]
  );

  // Start or restart a game
  const handleStartNewGame = useCallback(
    (
      colorChoice: Color | 'random' = playerColor,
      diff: EngineDifficulty = difficulty,
      tc: TimeControlConfig = timeControl,
      customFen?: string
    ) => {
      gameSessionIdRef.current += 1;
      chessEngine.startNewGame();
      coachVoiceService.stop();
      grandmasterCoach.resetSession();
      lastUserCoachRef.current = null;

      const resolvedColor: Color =
        colorChoice === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorChoice;

      const newChess = new Chess();
      if (customFen) {
        try {
          newChess.load(customFen);
        } catch {
          newChess.reset();
        }
      }

      chessRef.current = newChess;
      playerColorRef.current = resolvedColor;
      isPlayingRef.current = true;

      setChess(newChess);
      setDisplayChess(newChess);
      setMoves([]);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      setHintMove(null);
      setHintStage(1);
      setThreatMove(null);
      setLiveFeedback(null);
      setCoachExplanation(grandmasterCoach.createInitialState(newChess.fen(), resolvedColor));
      setStatusNotice(null);
      setEvalScore(chessEngine.evaluatePosition(newChess));
      setGameResult(null);
      setIsEngineThinking(false);
      setIsPlaying(true);
      setPlayerColor(resolvedColor);
      setBoardOrientation(resolvedColor);
      setDifficulty(diff);
      setTimeControl(tc);

      const initialMs = tc.minutes * 60 * 1000;
      whiteTimeMsRef.current = initialMs;
      blackTimeMsRef.current = initialMs;
      setWhiteTimeMs(initialMs);
      setBlackTimeMs(initialMs);
      lastClockTickRef.current = performance.now();

      soundManager.playGameStart();

      if (newChess.turn() !== resolvedColor) {
        setTurnState('computer_thinking');
        makeEngineMove(newChess, [], diff, speedMode);
      } else {
        setTurnState('your_turn');
      }
    },
    [playerColor, difficulty, timeControl, speedMode, makeEngineMove]
  );

  // Accurate Timestamp-Based Chess Clocks
  useEffect(() => {
    if (!isPlaying || gameResult || timeControl.minutes === 0) return;

    lastClockTickRef.current = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - lastClockTickRef.current;
      lastClockTickRef.current = now;

      const activeTurn = chessRef.current.turn();
      if (activeTurn === 'w') {
        whiteTimeMsRef.current = Math.max(0, whiteTimeMsRef.current - elapsedMs);
        const roundedSec = Math.ceil(whiteTimeMsRef.current / 1000) * 1000;
        setWhiteTimeMs((prev) => (Math.abs(prev - roundedSec) >= 500 ? roundedSec : prev));
        if (whiteTimeMsRef.current <= 0) {
          finishGame(playerColorRef.current === 'w' ? 'loss' : 'win', 'Time Out');
        }
      } else {
        blackTimeMsRef.current = Math.max(0, blackTimeMsRef.current - elapsedMs);
        const roundedSec = Math.ceil(blackTimeMsRef.current / 1000) * 1000;
        setBlackTimeMs((prev) => (Math.abs(prev - roundedSec) >= 500 ? roundedSec : prev));
        if (blackTimeMsRef.current <= 0) {
          finishGame(playerColorRef.current === 'b' ? 'loss' : 'win', 'Time Out');
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, gameResult, timeControl.minutes, finishGame]);

  // PHASE 3 — INSTANT BOARD RESPONSE:
  // Validate move immediately, update board immediately, then trigger engine asynchronously!
  const handlePlayerMove = (m: {
    from: Square;
    to: Square;
    promotion?: PieceSymbol;
  }) => {
    if (!isPlaying || chess.turn() !== playerColor) return;

    try {
      const fenBefore = chess.fen();
      const prevScore = chessEngine.evaluatePosition(chess);
      const piece = chess.get(m.from);
      const targetPiece = chess.get(m.to);

      // 1. Validate move immediately using chess.js
      const res = chess.move({
        from: m.from,
        to: m.to,
        promotion: m.promotion || 'q',
      });

      if (!res) return;

      // 2. Update the chessboard state IMMEDIATELY (<1ms) — never wait for Stockfish!
      const sessionAtMove = gameSessionIdRef.current;
      const newChess = new Chess(chess.fen());
      const fenAfter = newChess.fen();
      chessRef.current = newChess;
      setChess(newChess);
      setDisplayChess(newChess);
      setLastMove({ from: m.from, to: m.to });
      setHintMove(null);
      setHintStage(1);
      setThreatMove(null);

      // 3. Update player clock with increment
      if (timeControl.minutes > 0 && timeControl.incrementSeconds > 0) {
        const incMs = timeControl.incrementSeconds * 1000;
        if (playerColor === 'w') {
          whiteTimeMsRef.current += incMs;
          setWhiteTimeMs(whiteTimeMsRef.current);
        } else {
          blackTimeMsRef.current += incMs;
          setBlackTimeMs(blackTimeMsRef.current);
        }
      }
      lastClockTickRef.current = performance.now();

      // 4. Compute instant static evaluation & move history immediately (<0.5ms)
      const newScore = chessEngine.evaluatePosition(newChess);
      setEvalScore(newScore);

      const initialFeedback = generateInstantMoveAnalysis({
        fenBefore,
        fenAfter,
        san: res.san,
        from: m.from,
        to: m.to,
        moverColor: playerColor,
        prevEvalWhiteCp: prevScore,
        newEvalWhiteCp: newScore,
      });

      if (assistance.moveFeedback) {
        setLiveFeedback(initialFeedback);
      } else {
        setLiveFeedback(null);
      }

      const moveIdx = moves.length;
      const playerGameMove: GameMove = {
        from: m.from,
        to: m.to,
        san: res.san,
        piece: piece?.type || 'p',
        color: piece?.color || 'w',
        captured: targetPiece?.type,
        fen: fenAfter,
        evalScore: newScore,
        classification: initialFeedback.classification,
      };

      const updatedMoves = [...moves, playerGameMove];
      setMoves(updatedMoves);
      setCurrentMoveIndex(updatedMoves.length - 1);

      // Immediately update Grandmaster Coach with initial move analysis
      const quickCoachExp = grandmasterCoach.analyzeUserMove({
        fenBefore,
        fenAfter,
        san: res.san,
        from: m.from,
        to: m.to,
        moverColor: playerColor,
        prevEvalWhiteCp: prevScore,
        newEvalWhiteCp: newScore,
        moveCount: updatedMoves.length,
      });
      lastUserCoachRef.current = quickCoachExp;
      setCoachExplanation(quickCoachExp);

      // 5. Check game termination
      const ended = checkGameTermination(newChess, updatedMoves);

      // 6. Send the new FEN position to the engine Web Worker asynchronously
      if (!ended) {
        makeEngineMove(newChess, updatedMoves, difficulty, speedMode);
      }

      // 7. Enrich with best-candidate comparison asynchronously after frame paint
      setTimeout(() => {
        if (sessionAtMove !== gameSessionIdRef.current) return;
        const quickCandidates = chessEngine.computeQuickCandidates(fenBefore, 1);
        const bestCand = quickCandidates[0];
        if (!bestCand || sessionAtMove !== gameSessionIdRef.current) return;

        const enrichedFeedback = generateInstantMoveAnalysis({
          fenBefore,
          fenAfter,
          san: res.san,
          from: m.from,
          to: m.to,
          moverColor: playerColor,
          prevEvalWhiteCp: prevScore,
          newEvalWhiteCp: newScore,
          bestMoveFrom: bestCand.from,
          bestMoveTo: bestCand.to,
        });
        if (assistance.moveFeedback) {
          setLiveFeedback(enrichedFeedback);
        }

        const enrichedCoachExp = grandmasterCoach.analyzeUserMove({
          fenBefore,
          fenAfter,
          san: res.san,
          from: m.from,
          to: m.to,
          moverColor: playerColor,
          prevEvalWhiteCp: prevScore,
          newEvalWhiteCp: newScore,
          bestMoveFrom: bestCand.from,
          bestMoveTo: bestCand.to,
          moveCount: updatedMoves.length,
          pv: bestCand.pv,
        });
        lastUserCoachRef.current = enrichedCoachExp;
        if (chessRef.current.fen() === fenAfter) {
          setCoachExplanation(enrichedCoachExp);
        }

        setMoves((prev) => {
          if (!prev[moveIdx] || prev[moveIdx].fen !== fenAfter) return prev;
          const copy = [...prev];
          copy[moveIdx] = {
            ...copy[moveIdx],
            classification: enrichedCoachExp.classification || enrichedFeedback.classification,
            bestAlternativeSan: enrichedFeedback.bestMoveSan,
            bestAlternativeUci: enrichedFeedback.bestMoveUci,
          };
          return copy;
        });
      }, 0);
    } catch (err) {
      console.error('Player move error:', err);
    }
  };

  // Request 3-Level Progressive Interactive Hint (PART 8)
  const handleGetHint = () => {
    if (!isPlaying || !assistance.hintsEnabled || chess.turn() !== playerColor) return;
    const nextLevel: CoachHintLevel =
      coachExplanation.state === 'HINTING'
        ? hintStage === 1
          ? 2
          : hintStage === 2
          ? 3
          : 1
        : 1;

    const hintExp = grandmasterCoach.generateProgressiveHint(
      chess.fen(),
      nextLevel,
      moves.length
    );
    setHintStage(nextLevel);
    setCoachExplanation(hintExp);
    if (nextLevel === 3 && hintExp.bestAlternativeUci) {
      setHintMove(hintExp.bestAlternativeUci);
    } else {
      setHintMove(null);
    }
  };

  // Select historical move in MoveHistory
  const handleSelectMove = (index: number) => {
    if (index === -1) {
      const startBoard = new Chess();
      setDisplayChess(startBoard);
      setCurrentMoveIndex(-1);
      setLastMove(null);
      return;
    }
    const target = moves[index];
    if (target) {
      const b = new Chess();
      b.load(target.fen);
      setDisplayChess(b);
      setCurrentMoveIndex(index);
      setLastMove({ from: target.from, to: target.to });
    }
  };

  // Snap back to live game position if user was inspecting move history
  const handleResumeLiveGame = useCallback(() => {
    if (moves.length === 0) return;
    const latestIdx = moves.length - 1;
    const latestMove = moves[latestIdx];
    const liveBoard = new Chess(chessRef.current.fen());
    setDisplayChess(liveBoard);
    setCurrentMoveIndex(latestIdx);
    if (latestMove) {
      setLastMove({ from: latestMove.from, to: latestMove.to });
    }
  }, [moves]);

  // Resign
  const handleResign = () => {
    if (!isPlaying || gameResult) return;
    finishGame('loss', 'Player Resigned');
  };

  // Offer Draw
  const handleOfferDraw = () => {
    if (!isPlaying || gameResult) return;
    if (Math.abs(evalScore) < 150 && moves.length >= 6) {
      finishGame('draw', 'Draw Agreed by Mutual Consent');
    } else {
      showToast(
        moves.length < 6
          ? 'Play at least 3 full turns before offering a draw.'
          : 'Stockfish declines the draw offer and plays on!'
      );
    }
  };

  // Undo (Takeback): works even while computer is thinking by cancelling the active search and syncing Coach!
  const handleUndo = () => {
    if (!isPlaying || !assistance.takebacksAllowed || moves.length === 0) return;

    gameSessionIdRef.current += 1;
    chessEngine.stop();
    coachVoiceService.stop();
    lastUserCoachRef.current = null;
    setIsEngineThinking(false);

    // If it is currently the computer's turn (engine was thinking), undo 1 ply (player's last move).
    // If it is the player's turn, undo 2 plies (computer's move + player's move).
    const pliesToUndo =
      chess.turn() !== playerColor || moves.length === 1 ? 1 : 2;

    for (let i = 0; i < pliesToUndo; i++) {
      chess.undo();
    }

    const newChess = new Chess(chess.fen());
    chessRef.current = newChess;
    setChess(newChess);
    setDisplayChess(newChess);
    setEvalScore(chessEngine.evaluatePosition(newChess));

    const updated = moves.slice(0, moves.length - pliesToUndo);
    setMoves(updated);
    setCurrentMoveIndex(updated.length - 1);
    setHintMove(null);
    setHintStage(1);
    setThreatMove(null);
    setLiveFeedback(null);
    setCoachExplanation(
      grandmasterCoach.createInitialState(
        newChess.fen(),
        playerColor,
        'Takeback complete. Examine the restored position and choose your strongest continuation.'
      )
    );
    setTurnState('your_turn');
    setLastMove(
      updated.length > 0
        ? {
            from: updated[updated.length - 1].from,
            to: updated[updated.length - 1].to,
          }
        : null
    );
  };

  // Switch Sides mid-game (Phase 6C)
  const handleSwitchSides = () => {
    if (!isPlaying || gameResult) return;
    gameSessionIdRef.current += 1;
    chessEngine.stop();
    coachVoiceService.stop();
    lastUserCoachRef.current = null;
    setIsEngineThinking(false);

    const newPlayerColor: Color = playerColor === 'w' ? 'b' : 'w';
    playerColorRef.current = newPlayerColor;
    setPlayerColor(newPlayerColor);
    setBoardOrientation(newPlayerColor);
    setHintMove(null);
    setHintStage(1);
    setCoachExplanation(
      grandmasterCoach.createInitialState(
        chessRef.current.fen(),
        newPlayerColor,
        `Sides switched! You are now playing as ${
          newPlayerColor === 'w' ? 'White' : 'Black'
        }.`
      )
    );
    showToast(`Switched sides! You are now playing as ${newPlayerColor === 'w' ? 'White' : 'Black'}.`);

    if (chessRef.current.turn() !== newPlayerColor) {
      makeEngineMove(chessRef.current, movesRef.current, difficulty, speedMode);
    } else {
      setTurnState('your_turn');
    }
  };

  // Flip Board Perspective (Phase 6C)
  const handleFlipBoard = () => {
    setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
  };

  // Copy PGN
  const handleCopyPgn = () => {
    const pgn = generatePgnFromMoves(moves, {
      white: playerColor === 'w' ? 'Player' : activeDifficulty.name,
      black: playerColor === 'b' ? 'Player' : activeDifficulty.name,
      result: gameResult?.result || '*',
      playerColor,
      opening: `${currentOpening.eco} ${currentOpening.name}`,
    });
    navigator.clipboard.writeText(pgn);
    setCopiedType('pgn');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Export FEN
  const handleExportFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedType('fen');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Save Game Snapshot
  const handleSaveGame = () => {
    const userAcc = calculateColorAccuracy(moves, playerColor);
    const oppAcc = calculateColorAccuracy(moves, playerColor === 'w' ? 'b' : 'w');
    const savedRecord: GameRecord = {
      id: `game-${Date.now()}`,
      date: 'Saved Match',
      playerColor,
      opponent: activeDifficulty.name,
      opponentElo: activeDifficulty.elo,
      result: evalScore > 150 ? 'win' : evalScore < -150 ? 'loss' : 'draw',
      reason: 'Saved Snapshot',
      moves: [...moves],
      userAccuracy: userAcc,
      opponentAccuracy: oppAcc,
      initialTimeMinutes: timeControl.minutes,
      incrementSeconds: timeControl.incrementSeconds,
      openingName: currentOpening.name,
      openingEco: currentOpening.eco,
    };
    const updatedStats = StorageService.recordGame(savedRecord);
    onUpdateStats(updatedStats);
    setCopiedType('saved');
    showToast('Game saved to your Profile & Game Analysis history!');
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Import Custom FEN
  const handleImportFenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fenImportInput.trim()) return;
    try {
      const testChess = new Chess();
      testChess.load(fenImportInput.trim());
      handleStartNewGame(testChess.turn(), difficulty, timeControl, fenImportInput.trim());
      setShowFenImport(false);
      setFenImportInput('');
      showToast('Custom FEN position loaded!');
    } catch {
      showToast('Invalid FEN string. Please verify piece placement and side to move.');
    }
  };

  const formatClockMs = (ms: number) => {
    const totalSecs = Math.max(0, Math.ceil(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Live Player Accuracy in current game
  const liveUserAccuracy = useMemo(
    () => calculateColorAccuracy(moves, playerColor),
    [moves, playerColor]
  );

  // Captured pieces calculation
  const capturedPieces = useMemo(() => {
    const whiteCaptured: PieceSymbol[] = [];
    const blackCaptured: PieceSymbol[] = [];
    moves.slice(0, currentMoveIndex + 1).forEach((m) => {
      if (m.captured) {
        if (m.color === 'w') {
          whiteCaptured.push(m.captured);
        } else {
          blackCaptured.push(m.captured);
        }
      }
    });
    return { white: whiteCaptured, black: blackCaptured };
  }, [moves, currentMoveIndex]);

  const isViewingLatest = currentMoveIndex === moves.length - 1;

  const turnStateBadge = useMemo(() => {
    switch (turnState) {
      case 'your_turn':
        return {
          label: 'Your Turn',
          cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'computer_thinking':
        return {
          label: 'Computer Thinking',
          cls: 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse',
        };
      case 'computer_moving':
        return {
          label: 'Computer Moving',
          cls: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      case 'game_over':
        return {
          label: 'Game Over',
          cls: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
    }
  }, [turnState]);

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1520px] mx-auto">
      {/* Clean Top Match Setup Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#111624] border border-white/[0.08] p-2.5 sm:p-4 rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#171c2b] border border-white/10 flex items-center justify-center text-base sm:text-xl shrink-0">
            {activeDifficulty.avatar}
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-slate-100 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>{activeDifficulty.name}</span>
              <span className="text-[11px] text-emerald-400 font-mono">
                {activeDifficulty.elo} ELO
              </span>
              <span
                data-testid="turn-state-badge"
                className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider ${turnStateBadge.cls}`}
              >
                {turnStateBadge.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
              Opening:{' '}
              <span className="text-slate-200 font-medium">
                {currentOpening.eco} {currentOpening.name}
              </span>
            </p>
          </div>
        </div>

        {/* Color, Time Control, Difficulty, Options & New Game */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Play as White / Black / Random */}
          <div className="flex items-center bg-[#0a0e18] p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleStartNewGame('w', difficulty, timeControl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                playerColor === 'w'
                  ? 'bg-emerald-500 text-[#070a12]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ♔ White
            </button>
            <button
              type="button"
              onClick={() => handleStartNewGame('b', difficulty, timeControl)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                playerColor === 'b'
                  ? 'bg-emerald-500 text-[#070a12]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ♚ Black
            </button>
            <button
              type="button"
              onClick={() => handleStartNewGame('random', difficulty, timeControl)}
              title="Play Random Color"
              className="px-2 py-1 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all flex items-center gap-1"
            >
              <Shuffle className="w-3 h-3" />
              <span className="hidden md:inline">Random</span>
            </button>
          </div>

          {/* Engine Difficulty Selector — starts fresh match at selected difficulty */}
          <select
            aria-label="Engine Difficulty"
            value={difficulty}
            onChange={(e) => {
              const newDiff = e.target.value as EngineDifficulty;
              handleStartNewGame(playerColor, newDiff, timeControl);
            }}
            className="text-xs bg-[#0a0e18] text-slate-200 border border-white/10 rounded-xl px-2.5 py-1.5 focus:border-emerald-500 focus:outline-hidden"
          >
            {(Object.keys(DIFFICULTY_LEVELS) as EngineDifficulty[]).map((key) => (
              <option key={key} value={key}>
                {DIFFICULTY_LEVELS[key].name} ({DIFFICULTY_LEVELS[key].elo} Elo)
              </option>
            ))}
          </select>

          {/* Time Control Selector */}
          <select
            aria-label="Time Control"
            value={timeControl.id}
            onChange={(e) => {
              const selectedId = e.target.value;
              if (selectedId === 'custom') {
                setShowCustomTimeModal(true);
                return;
              }
              const preset =
                TIME_CONTROL_PRESETS.find((t) => t.id === selectedId) ||
                TIME_CONTROL_PRESETS[6];
              handleStartNewGame(playerColor, difficulty, preset);
            }}
            className="text-xs bg-[#0a0e18] text-slate-200 border border-white/10 rounded-xl px-2.5 py-1.5 focus:border-emerald-500 focus:outline-hidden font-mono"
          >
            {TIME_CONTROL_PRESETS.map((tc) => (
              <option key={tc.id} value={tc.id}>
                {tc.label}
              </option>
            ))}
          </select>

          {/* Options & Assistance Toggle */}
          <button
            type="button"
            onClick={() => setShowAssistancePanel(!showAssistancePanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              showAssistancePanel
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-[#0a0e18] border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Assistance</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartNewGame(playerColor, difficulty, timeControl)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#070a12] text-xs font-extrabold transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Game</span>
          </button>
        </div>
      </div>

      {/* Collapsible Computer Assistance, Engine Speed, & PGN/FEN Drawer */}
      {showAssistancePanel && (
        <div
          data-testid="assistance-panel"
          className="bg-[#111624] border border-white/10 rounded-2xl p-4 space-y-4 animate-in fade-in"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Coaching Assistance & Board Options</span>
            </span>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                aria-label="Engine Thinking Speed"
                value={speedMode}
                onChange={(e) => {
                  const mode = e.target.value as EngineSpeedMode;
                  setSpeedMode(mode);
                  chessEngine.setSpeedMode(mode);
                }}
                className="text-xs bg-[#0a0e18] text-slate-200 border border-white/10 rounded-lg px-2.5 py-1"
              >
                <option value="fast">⚡ Speed: Fast</option>
                <option value="balanced">⚖️ Speed: Balanced</option>
                <option value="deep">🧠 Speed: Deep</option>
              </select>

              <button
                type="button"
                onClick={handleSwitchSides}
                disabled={!isPlaying}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a0e18] hover:bg-[#171c2b] text-slate-200 border border-white/10 disabled:opacity-40"
              >
                <Repeat className="w-3 h-3 text-cyan-400" />
                <span>Switch Sides</span>
              </button>

              <button
                type="button"
                onClick={handleSaveGame}
                disabled={moves.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a0e18] hover:bg-[#171c2b] text-slate-200 border border-white/10 disabled:opacity-40"
              >
                {copiedType === 'saved' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Save className="w-3 h-3 text-emerald-400" />
                )}
                <span>{copiedType === 'saved' ? 'Saved!' : 'Save Game'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyPgn}
                disabled={moves.length === 0}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a0e18] hover:bg-[#171c2b] text-slate-200 border border-white/10 disabled:opacity-40"
              >
                {copiedType === 'pgn' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-cyan-400" />
                )}
                <span>{copiedType === 'pgn' ? 'PGN Copied' : 'Copy PGN'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportFen}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a0e18] hover:bg-[#171c2b] text-slate-200 border border-white/10"
              >
                {copiedType === 'fen' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-amber-400" />
                )}
                <span>{copiedType === 'fen' ? 'FEN Copied' : 'Copy FEN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFenImport(!showFenImport)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0a0e18] hover:bg-[#171c2b] text-slate-200 border border-white/10"
              >
                <Upload className="w-3 h-3 text-emerald-400" />
                <span>Load FEN</span>
              </button>
            </div>
          </div>

          {showFenImport && (
            <form onSubmit={handleImportFenSubmit} className="flex gap-2">
              <input
                type="text"
                value={fenImportInput}
                onChange={(e) => setFenImportInput(e.target.value)}
                placeholder="Paste FEN position string..."
                className="flex-1 bg-[#0a0e18] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070a12] text-xs font-bold"
              >
                Load Position
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {(
              [
                { key: 'hintsEnabled', label: 'Hints Button' },
                { key: 'bestMoveArrow', label: 'Best Move Arrow' },
                { key: 'threatArrows', label: 'Threat Arrows' },
                { key: 'evalBar', label: 'Evaluation Bar' },
                { key: 'moveFeedback', label: 'Move Feedback Badges' },
                { key: 'thinkingIndicator', label: 'Thinking Indicator' },
                { key: 'engineAnalysisPanel', label: 'Live Engine Telemetry' },
                { key: 'takebacksAllowed', label: 'Allow Takebacks' },
              ] as Array<{ key: keyof AssistanceSettings; label: string }>
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#0a0e18] border border-white/10 cursor-pointer hover:border-emerald-500/40"
              >
                <span className="font-semibold text-slate-200">{item.label}</span>
                <input
                  type="checkbox"
                  checked={assistance[item.key]}
                  onChange={(e) =>
                    setAssistance((prev) => ({
                      ...prev,
                      [item.key]: e.target.checked,
                    }))
                  }
                  className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Custom Time Control Modal */}
      {showCustomTimeModal && (
        <div className="bg-[#111624] border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-bold text-white">
            Custom Time Control (Minutes + Fischer Increment Seconds)
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-1.5 text-slate-300">
              <span>Minutes:</span>
              <input
                type="number"
                min={1}
                max={120}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 px-2 py-1 rounded bg-[#0a0e18] border border-white/10 text-white font-mono"
              />
            </label>
            <label className="flex items-center gap-1.5 text-slate-300">
              <span>Increment (sec):</span>
              <input
                type="number"
                min={0}
                max={60}
                value={customIncrement}
                onChange={(e) =>
                  setCustomIncrement(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="w-16 px-2 py-1 rounded bg-[#0a0e18] border border-white/10 text-white font-mono"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const customTc: TimeControlConfig = {
                  id: 'custom',
                  label: `⚙️ ${customMinutes}+${customIncrement} Custom`,
                  category: 'custom',
                  minutes: customMinutes,
                  incrementSeconds: customIncrement,
                };
                setShowCustomTimeModal(false);
                handleStartNewGame(playerColor, difficulty, customTc);
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070a12] font-bold"
            >
              Start Custom Match
            </button>
            <button
              type="button"
              onClick={() => setShowCustomTimeModal(false)}
              className="px-2.5 py-1.5 rounded-lg bg-[#171c2b] text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Optional Toast Notice */}
      {statusNotice && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold text-center animate-in fade-in">
          {statusNotice}
        </div>
      )}

      {/* Main 12-Column Gameplay Layout — Chessboard Primary Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left/Center (Cols 1-7): Opponent Bar, Chessboard + EvalBar, Player Bar, Core Controls */}
        <div className="lg:col-span-7 flex flex-col items-center bg-[#111624] border border-white/[0.08] rounded-2xl p-3.5 sm:p-5 space-y-3">
          {/* Opponent Bar + Clock */}
          <div className="w-full max-w-[580px] flex items-center justify-between text-xs px-3.5 py-2.5 bg-[#171c2b] border border-white/[0.07] rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#0a0e18] border border-white/10 flex items-center justify-center text-lg shrink-0">
                {activeDifficulty.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 truncate">
                    {activeDifficulty.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#283147] text-amber-400 font-mono text-[10px] font-bold">
                    {activeDifficulty.elo}
                  </span>
                </div>
                <CapturedPieces
                  captured={playerColor === 'w' ? capturedPieces.black : capturedPieces.white}
                  playerColor={playerColor === 'w' ? 'b' : 'w'}
                />
              </div>
            </div>

            {/* Opponent Clock & Thinking Indicator */}
            <div className="flex items-center gap-2.5 shrink-0">
              {isEngineThinking && assistance.thinkingIndicator && (
                <div
                  data-testid="engine-thinking-indicator"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-300 font-mono animate-pulse"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
              {timeControl.minutes > 0 && (
                <div
                  className={`chess-clock flex items-center gap-1.5 text-sm sm:text-base font-bold ${
                    chess.turn() !== playerColor ? 'active text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {formatClockMs(playerColor === 'w' ? blackTimeMs : whiteTimeMs)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Historical Move Inspection Banner (Prevents Board Lockout Confusion) */}
          {!isViewingLatest && moves.length > 0 && (
            <div
              data-testid="history-review-banner"
              className="w-full max-w-[580px] flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs"
            >
              <span>
                Viewing historical position ({currentMoveIndex + 1} of {moves.length})
              </span>
              <button
                type="button"
                onClick={handleResumeLiveGame}
                className="px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#070a12] font-bold text-xs transition-colors"
              >
                Return to Live Game
              </button>
            </div>
          )}

          {/* Central Chessboard + Eval Bar */}
          <div className="flex gap-2.5 sm:gap-3.5 items-stretch justify-center w-full">
            {assistance.evalBar && (
              <EvalBar
                score={evalScore}
                orientation={boardOrientation}
                className="h-auto min-h-[280px] max-h-[560px]"
              />
            )}
            <div className="flex-1 max-w-[560px] aspect-square flex items-center justify-center">
              <Chessboard
                chess={displayChess}
                orientation={boardOrientation}
                theme={settings.boardTheme}
                showCoordinates={settings.showCoordinates}
                showLegalMoves={settings.showLegalMoves}
                autoQueen={settings.autoQueen}
                interactive={
                  isPlaying &&
                  isViewingLatest &&
                  chess.turn() === playerColor
                }
                onDisabledInteract={() => {
                  if (!isViewingLatest) {
                    handleResumeLiveGame();
                  }
                }}
                lastMove={lastMove}
                hintMove={hintMove}
                bestMove={
                  assistance.bestMoveArrow &&
                  liveFeedback &&
                  liveFeedback.classification !== 'best' &&
                  liveFeedback.classification !== 'brilliant'
                    ? liveFeedback.bestMoveUci
                    : null
                }
                threatMove={
                  assistance.threatArrows && threatMove
                    ? { from: threatMove.from, to: threatMove.to }
                    : null
                }
                lastMoveClassification={
                  assistance.moveFeedback && currentMoveIndex >= 0
                    ? moves[currentMoveIndex]?.classification
                    : null
                }
                onMove={handlePlayerMove}
              />
            </div>
          </div>

          {/* Player Bar + Clock */}
          <div className="w-full max-w-[580px] flex items-center justify-between text-xs px-3.5 py-2.5 bg-[#171c2b] border border-white/[0.07] rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-extrabold text-emerald-300 text-xs shrink-0">
                YOU
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-100 truncate">
                    You ({playerColor === 'w' ? 'White' : 'Black'})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Accuracy: <strong className="text-emerald-400">{liveUserAccuracy}%</strong>
                  </span>
                </div>
                <CapturedPieces
                  captured={playerColor === 'w' ? capturedPieces.white : capturedPieces.black}
                  playerColor={playerColor === 'w' ? 'w' : 'b'}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {timeControl.minutes > 0 && (
                <div
                  className={`chess-clock flex items-center gap-1.5 text-sm sm:text-base font-bold ${
                    chess.turn() === playerColor ? 'active text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {formatClockMs(playerColor === 'w' ? whiteTimeMs : blackTimeMs)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Essential In-Game Action Controls */}
          <div className="w-full max-w-[580px] flex flex-wrap items-center justify-center gap-2 pt-1">
            {assistance.hintsEnabled && (
              <button
                type="button"
                onClick={handleGetHint}
                disabled={!isPlaying || chess.turn() !== playerColor}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold border border-emerald-500/30 disabled:opacity-40 transition-colors"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Hint</span>
              </button>
            )}
            {assistance.takebacksAllowed && (
              <button
                type="button"
                onClick={handleUndo}
                disabled={!isPlaying || moves.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 disabled:opacity-40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleFlipBoard}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
              title="Flip Board Orientation"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>Flip</span>
            </button>
            <button
              type="button"
              onClick={() => handleStartNewGame(playerColor, difficulty, timeControl)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
              title="Restart Current Match"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart</span>
            </button>
            <button
              type="button"
              onClick={handleOfferDraw}
              disabled={!isPlaying}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-200 text-xs font-semibold border border-white/10 disabled:opacity-40 transition-colors"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>
            <button
              type="button"
              onClick={handleResign}
              disabled={!isPlaying}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171c2b] hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 text-slate-200 text-xs font-semibold border border-white/10 disabled:opacity-40 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Resign</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar (Cols 8-12): Engine Telemetry, Live Grandmaster Coach & Move History */}
        <div className="lg:col-span-5 space-y-4">
          {assistance.engineAnalysisPanel && (
            <div
              data-testid="engine-telemetry-panel"
              className="bg-[#111624] border border-white/[0.08] rounded-2xl p-4 shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Live UCI Worker Telemetry</span>
                </span>
                <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  <span>{telemetry.nps.toLocaleString()} NPS</span>
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-[#0a0e18] border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400">Evaluation</div>
                  <div className="font-mono font-black text-white text-sm mt-0.5">
                    {chessEngine.formatScore(evalScore)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0a0e18] border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400">Search Depth</div>
                  <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                    d{telemetry.depth} / sd{telemetry.selDepth}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#0a0e18] border border-white/[0.06]">
                  <div className="text-[10px] text-slate-400">Move Time</div>
                  <div className="font-mono font-bold text-cyan-300 text-sm mt-0.5">
                    {telemetry.timeMs} ms
                  </div>
                </div>
              </div>

              {telemetry.pv.length > 0 && (
                <div className="text-[11px] bg-[#0a0e18] border border-white/[0.06] rounded-lg px-2.5 py-1.5 font-mono text-slate-300 truncate">
                  <span className="text-slate-500 mr-1.5">PV:</span>
                  {telemetry.pv.join(' ')}
                </div>
              )}

              {telemetry.candidates.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">
                    Top Candidate Moves
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {telemetry.candidates.map((cand, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-[#0a0e18] border border-white/[0.06] text-[11px] font-mono text-slate-200"
                      >
                        <strong className="text-emerald-400">{cand.san}</strong> (
                        {chessEngine.formatScore(cand.scoreCp)})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Interactive Grandmaster Chess Coach */}
          <GrandmasterCoach
            fen={displayChess.fen()}
            explanation={coachExplanation}
            hintLevel={hintStage}
            onRequestHint={(nextLevel, hintExp) => {
              setHintStage(nextLevel);
              setCoachExplanation(hintExp);
              if (nextLevel === 3 && hintExp.bestAlternativeUci) {
                setHintMove(hintExp.bestAlternativeUci);
              } else {
                setHintMove(null);
              }
            }}
            onExplainPosition={(planExp) => {
              setCoachExplanation(planExp);
            }}
            onHighlightSquares={(arrow) => {
              setHintMove(arrow);
            }}
            onOpenLesson={(courseId: CourseLevelId, lessonId: string) => {
              onNavigate('learn', { courseId, lessonId });
            }}
          />

          <MoveHistory
            moves={moves}
            currentMoveIndex={currentMoveIndex}
            onSelectMove={handleSelectMove}
            openingEco={currentOpening.eco}
            openingName={currentOpening.name}
          />
        </div>
      </div>

      {/* Game Over & Personalized Grandmaster Review Modal (PART 13) */}
      {gameResult && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            data-testid="game-over-modal"
            className="bg-neutral-900 border border-neutral-700 max-w-lg w-full rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 my-auto"
          >
            <div className="flex items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-2xl shrink-0">
                  {gameResult.result === 'win'
                    ? '🏆'
                    : gameResult.result === 'draw'
                    ? '🤝'
                    : '⚔️'}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    {gameResult.result === 'win'
                      ? 'Victory!'
                      : gameResult.result === 'draw'
                      ? 'Game Drawn'
                      : 'Match Complete'}
                  </h3>
                  <p className="text-xs text-neutral-400">
                    {gameResult.reason} • vs {activeDifficulty.name} •{' '}
                    <span className="text-emerald-300 font-semibold">
                      {currentOpening.eco} {currentOpening.name}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] text-neutral-400">Accuracy</div>
                <div className="text-lg font-black font-mono text-emerald-400">
                  {gameResult.review?.userAccuracy ?? liveUserAccuracy}%
                </div>
              </div>
            </div>

            {/* Coach Summary */}
            {gameResult.review && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-emerald-500/30 text-xs text-neutral-200 leading-relaxed">
                <span className="font-bold text-emerald-400">GM Elena’s Review: </span>
                {gameResult.review.coachSummary}
              </div>
            )}

            {/* Move Classification Counts & Phase Performance */}
            {gameResult.review && (
              <div className="space-y-2.5">
                <div className="grid grid-cols-6 gap-1.5 text-center text-[11px]">
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-cyan-300 font-bold">!! / !</div>
                    <div className="font-mono font-bold text-white">
                      {gameResult.review.counts.brilliant + gameResult.review.counts.great}
                    </div>
                    <div className="text-[9px] text-neutral-500">Brill/Great</div>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-emerald-400 font-bold">★</div>
                    <div className="font-mono font-bold text-white">
                      {gameResult.review.counts.best}
                    </div>
                    <div className="text-[9px] text-neutral-500">Best</div>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-teal-300 font-bold">✓</div>
                    <div className="font-mono font-bold text-white">
                      {gameResult.review.counts.excellent + gameResult.review.counts.good}
                    </div>
                    <div className="text-[9px] text-neutral-500">Exc/Good</div>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-yellow-300 font-bold">⚡</div>
                    <div className="font-mono font-bold text-white">
                      {gameResult.review.counts.missed_win}
                    </div>
                    <div className="text-[9px] text-neutral-500">Missed</div>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-orange-400 font-bold">?</div>
                    <div className="font-mono font-bold text-white">
                      {gameResult.review.counts.mistake}
                    </div>
                    <div className="text-[9px] text-neutral-500">Mistake</div>
                  </div>
                  <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-rose-400 font-bold">??</div>
                    <div className="font-mono font-bold text-white">
                      {gameResult.review.counts.blunder}
                    </div>
                    <div className="text-[9px] text-neutral-500">Blunder</div>
                  </div>
                </div>

                {/* Opening / Tactical / Endgame Phase Scores */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400">Opening Play</div>
                    <div className="font-mono font-bold text-emerald-400">
                      {gameResult.review.phasePerformance.openingScore}%
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {gameResult.review.phasePerformance.openingGrade}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400">Tactical Play</div>
                    <div className="font-mono font-bold text-sky-400">
                      {gameResult.review.phasePerformance.tacticalScore}%
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {gameResult.review.phasePerformance.tacticalGrade}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="text-[10px] text-neutral-400">Endgame Play</div>
                    <div className="font-mono font-bold text-amber-300">
                      {gameResult.review.phasePerformance.endgameScore}%
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      {gameResult.review.phasePerformance.endgameGrade}
                    </div>
                  </div>
                </div>

                {/* Personalized Recommended Lessons */}
                {gameResult.review.recommendedLessons.length > 0 && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5 text-left">
                    <div className="text-[11px] font-bold text-amber-300">
                      Recommended Lessons Based on Your Game:
                    </div>
                    {gameResult.review.recommendedLessons.map((rec) => (
                      <button
                        key={rec.lessonId}
                        type="button"
                        onClick={() =>
                          onNavigate('learn', {
                            courseId: rec.courseId,
                            lessonId: rec.lessonId,
                          })
                        }
                        className="w-full text-left p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between gap-2 text-xs transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-emerald-300 truncate">
                            Level {rec.levelNumber}: {rec.title}
                          </div>
                          <div className="text-[10px] text-neutral-400 truncate">
                            {rec.reason}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400 shrink-0">
                          Study →
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('analysis', gameResult.gameRecord)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors"
              >
                <LineChart className="w-4 h-4" />
                <span>Deep Game Review</span>
              </button>

              <button
                type="button"
                onClick={() => handleStartNewGame(playerColor, difficulty, timeControl)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
