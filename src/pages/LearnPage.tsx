import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import confetti from 'canvas-confetti';
import { CHESS_COURSES } from '../data/lessons';
import {
  ChessLesson,
  AppSettings,
  UserStats,
  CourseLevelId,
  CoachExplanation,
} from '../types/chess';
import { Chessboard } from '../components/Chessboard/Chessboard';
import { GrandmasterCoach } from '../components/Coach/GrandmasterCoach';
import { grandmasterCoach } from '../services/grandmasterCoachService';
import { StorageService } from '../services/storage';
import { soundManager } from '../services/sound';
import {
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Award,
  BookOpen,
} from 'lucide-react';

interface LearnPageProps {
  settings: AppSettings;
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  initialContext?: { courseId?: CourseLevelId; lessonId?: string } | null;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  settings,
  stats,
  onUpdateStats,
  initialContext,
}) => {
  const [activeCourseId, setActiveCourseId] = useState<CourseLevelId>(
    initialContext?.courseId || 'beginner'
  );
  const [activeLesson, setActiveLesson] = useState<ChessLesson | null>(null);

  // Lesson interactive chess state
  const [chess, setChess] = useState<Chess>(new Chess());
  const [exerciseStatus, setExerciseStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [hintMove, setHintMove] = useState<{ from: Square; to: Square } | null>(null);
  const [coachExp, setCoachExp] = useState<CoachExplanation>(() =>
    grandmasterCoach.createInitialState(new Chess().fen(), 'w')
  );

  const activeCourse = CHESS_COURSES.find((c) => c.id === activeCourseId) || CHESS_COURSES[0];

  // Initialize or reset lesson board
  const loadLesson = useCallback((lesson: ChessLesson) => {
    setActiveLesson(lesson);
    const newChess = new Chess();
    if (lesson.initialFen && lesson.initialFen !== '8/8/8/8/8/8/8/8 w - - 0 1') {
      try {
        newChess.load(lesson.initialFen);
      } catch {
        newChess.reset();
      }
    } else if (lesson.initialFen === '8/8/8/8/8/8/8/8 w - - 0 1') {
      newChess.reset();
    }
    setChess(newChess);
    setExerciseStatus('pending');
    setFeedbackMessage('');
    setLastMove(null);
    setHintMove(null);
    setIsDemoRunning(false);
    setCoachExp({
      id: `lesson-${lesson.id}-${Date.now()}`,
      state: 'TEACHING',
      reaction: 'explaining',
      headline: `Lesson: ${lesson.title}`,
      speechBubble: lesson.task.instruction,
      detailedExplanation: lesson.instruction,
      conceptTag: lesson.title,
      fen: newChess.fen(),
      moveCount: 0,
      shouldSpeak: false,
    });
  }, []);

  useEffect(() => {
    if (initialContext?.courseId) {
      setActiveCourseId(initialContext.courseId);
      const targetCourse = CHESS_COURSES.find((c) => c.id === initialContext.courseId);
      if (targetCourse) {
        const targetLesson =
          targetCourse.lessons.find((l) => l.id === initialContext.lessonId) ||
          targetCourse.lessons[0];
        if (targetLesson) {
          loadLesson(targetLesson);
          return;
        }
      }
    }
    if (!activeLesson && activeCourse.lessons.length > 0) {
      loadLesson(activeCourse.lessons[0]);
    }
  }, [activeCourse, activeLesson, initialContext, loadLesson]);

  // Handle user move in practice exercise
  const handleUserMove = (move: { from: Square; to: Square; promotion?: PieceSymbol }) => {
    if (exerciseStatus === 'success' || !activeLesson) return;

    try {
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q',
      });

      if (!result) return;

      const newChess = new Chess(chess.fen());
      setChess(newChess);
      setLastMove({ from: move.from, to: move.to });

      // Check against expected moves in activeLesson
      const expected = activeLesson.task.expectedMoves;
      const playedSan = result.san;

      const isMatch = expected.some((m) => {
        // Strip checkmate/check symbols for lenient matching
        const cleanExp = m.replace(/[+#]/g, '');
        const cleanPlayed = playedSan.replace(/[+#]/g, '');
        return cleanExp === cleanPlayed;
      });

      if (isMatch) {
        setExerciseStatus('success');
        setFeedbackMessage(activeLesson.task.solutionExplanation);
        setCoachExp({
          id: `lesson-win-${Date.now()}`,
          state: 'PRAISING',
          reaction: 'happy',
          headline: `Exercise Solved • ${playedSan}`,
          speechBubble: activeLesson.task.solutionExplanation,
          detailedExplanation: activeLesson.instruction,
          conceptTag: activeLesson.title,
          moveSan: playedSan,
          classification: 'best',
          fen: newChess.fen(),
          moveCount: 1,
          shouldSpeak: true,
        });
        soundManager.playPuzzleCorrect();
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

        // Save progress
        const updated = StorageService.markLessonCompleted(activeLesson.id);
        onUpdateStats(updated);
      } else {
        setExerciseStatus('failed');
        const failText = `Not quite ${playedSan}—review the lesson objective ("${activeLesson.task.instruction}") and click Reset to try again!`;
        setFeedbackMessage(failText);
        setCoachExp({
          id: `lesson-try-${Date.now()}`,
          state: 'ENCOURAGING',
          reaction: 'explaining',
          headline: `Try Again • ${activeLesson.title}`,
          speechBubble: failText,
          detailedExplanation: activeLesson.instruction,
          fen: newChess.fen(),
          moveCount: 1,
          shouldSpeak: true,
        });
        soundManager.playPuzzleWrong();
      }
    } catch {
      // Illegal move
    }
  };

  // Play demonstration moves
  const handlePlayDemo = async () => {
    if (!activeLesson || !activeLesson.demoMoves || activeLesson.demoMoves.length === 0 || isDemoRunning) return;

    setIsDemoRunning(true);
    setExerciseStatus('pending');
    setFeedbackMessage('Playing demonstration moves...');

    const demoChess = new Chess();
    if (activeLesson.initialFen && activeLesson.initialFen !== '8/8/8/8/8/8/8/8 w - - 0 1') {
      try {
        demoChess.load(activeLesson.initialFen);
      } catch {
        demoChess.reset();
      }
    }

    setChess(new Chess(demoChess.fen()));

    for (const san of activeLesson.demoMoves) {
      await new Promise((r) => setTimeout(r, 900));
      try {
        const move = demoChess.move(san);
        if (move) {
          setChess(new Chess(demoChess.fen()));
          setLastMove({ from: move.from, to: move.to });
          soundManager.playMove();
        }
      } catch {
        break;
      }
    }

    setIsDemoRunning(false);
    setFeedbackMessage('Demo finished! Now complete the exercise below.');
  };

  const handleResetLesson = () => {
    if (activeLesson) {
      loadLesson(activeLesson);
    }
  };

  // Navigate to Next Lesson
  const handleNextLesson = () => {
    if (!activeLesson) return;
    const allCourseLessons = activeCourse.lessons;
    const currentIndex = allCourseLessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIndex < allCourseLessons.length - 1) {
      loadLesson(allCourseLessons[currentIndex + 1]);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 4-Level Progressive Curriculum Selector Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
          {CHESS_COURSES.map((course) => {
            const isActive = activeCourseId === course.id;
            const completedCount = course.lessons.filter((l) =>
              stats.lessonsCompleted.includes(l.id)
            ).length;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setActiveCourseId(course.id);
                  if (course.lessons.length > 0) loadLesson(course.lessons[0]);
                }}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                    : 'bg-neutral-950/70 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800/80'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span>{course.icon}</span>
                  <span className="truncate">
                    L{course.levelNumber}: {course.id.charAt(0).toUpperCase() + course.id.slice(1)}
                  </span>
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                    isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {completedCount}/{course.lessons.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-neutral-400 px-2 hidden lg:block shrink-0">
          Target: <span className="text-emerald-400 font-semibold">{activeCourse.levelElo}</span>
        </div>
      </div>

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Lesson Navigation List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <span className="truncate">{activeCourse.title}</span>
              </h3>
              <span className="text-xs font-mono text-neutral-400 shrink-0">
                {activeCourse.lessons.length} modules
              </span>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {activeCourse.lessons.map((lesson, idx) => {
                const isSelected = activeLesson?.id === lesson.id;
                const isCompleted = stats.lessonsCompleted.includes(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => loadLesson(lesson)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 border ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-white shadow-sm'
                        : 'bg-neutral-950/80 border-neutral-850 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-850'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="text-xs font-semibold truncate">{lesson.title}</div>
                        <div className="text-[10px] text-neutral-400 truncate">{lesson.description}</div>
                      </div>
                    </div>

                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-neutral-700 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Grandmaster Coach Card */}
          {activeLesson && (
            <GrandmasterCoach
              fen={chess.fen()}
              explanation={coachExp}
              onHighlightSquares={(arrow) => setHintMove(arrow)}
            />
          )}
        </div>

        {/* Right Column: Interactive Board & Lesson Task */}
        <div className="lg:col-span-8 space-y-4">
          {activeLesson ? (
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
              {/* Lesson Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Module {activeCourse.lessons.findIndex((l) => l.id === activeLesson.id) + 1} of {activeCourse.lessons.length}
                    </span>
                    {stats.lessonsCompleted.includes(activeLesson.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                        <Award className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-1">
                    {activeLesson.title}
                  </h2>
                </div>

                {/* Lesson Controls */}
                <div className="flex items-center gap-2">
                  {activeLesson.demoMoves && activeLesson.demoMoves.length > 0 && (
                    <button
                      onClick={handlePlayDemo}
                      disabled={isDemoRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 disabled:opacity-40 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                      <span>Watch Demo</span>
                    </button>
                  )}
                  <button
                    onClick={handleResetLesson}
                    className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition-colors"
                    title="Reset Exercise"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lesson Concept Explanation */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 text-sm text-neutral-300 leading-relaxed">
                {activeLesson.instruction}
              </div>

              {/* Interactive Board & Task Banner */}
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center">
                {/* Chessboard Container */}
                <div className="w-full max-w-[420px] aspect-square flex items-center justify-center">
                  <Chessboard
                    chess={chess}
                    orientation={activeLesson.playerColor}
                    theme={settings.boardTheme}
                    showCoordinates={settings.showCoordinates}
                    showLegalMoves={settings.showLegalMoves}
                    autoQueen={settings.autoQueen}
                    interactive={!isDemoRunning && exerciseStatus !== 'success'}
                    lastMove={lastMove}
                    hintMove={hintMove}
                    onMove={handleUserMove}
                  />
                </div>

                {/* Task Instructions & Feedback Box */}
                <div className="w-full md:w-80 space-y-4">
                  <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Your Practice Exercise</span>
                    </span>
                    <p className="text-sm font-medium text-white leading-snug">
                      {activeLesson.task.instruction}
                    </p>
                  </div>

                  {/* Feedback Message */}
                  {feedbackMessage && (
                    <div
                      className={`p-4 rounded-xl text-xs font-medium leading-relaxed animate-in fade-in ${
                        exerciseStatus === 'success'
                          ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-200'
                          : exerciseStatus === 'failed'
                          ? 'bg-rose-950/60 border border-rose-500/50 text-rose-200'
                          : 'bg-neutral-950 text-neutral-300'
                      }`}
                    >
                      {feedbackMessage}
                    </div>
                  )}

                  {/* Next Lesson Action */}
                  {exerciseStatus === 'success' && (
                    <button
                      onClick={handleNextLesson}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all hover:scale-105"
                    >
                      <span>Continue to Next Lesson</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
