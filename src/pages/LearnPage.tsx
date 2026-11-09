import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { OpeningsPage } from './OpeningsPage';
import { PracticePage } from './PracticePage';
import { NavPage } from '../components/Navigation/Sidebar';
import {
  CheckCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Award,
  BookOpen,
  GraduationCap,
  Search,
  Compass,
} from 'lucide-react';

interface LearnPageProps {
  settings: AppSettings;
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  onNavigate?: (page: NavPage, context?: unknown) => void;
  initialContext?: {
    subTab?: 'lessons' | 'openings' | 'practice';
    courseId?: CourseLevelId;
    lessonId?: string;
  } | null;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  settings,
  stats,
  onUpdateStats,
  onNavigate,
  initialContext,
}) => {
  const [subTab, setSubTab] = useState<'lessons' | 'openings' | 'practice'>(
    initialContext?.subTab || 'lessons'
  );
  const [activeCourseId, setActiveCourseId] = useState<CourseLevelId>(
    initialContext?.courseId || 'beginner'
  );
  const [activeLesson, setActiveLesson] = useState<ChessLesson | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

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
  const revertTimerRef = useRef<number | null>(null);

  const clearRevertTimer = () => {
    if (revertTimerRef.current !== null) {
      window.clearTimeout(revertTimerRef.current);
      revertTimerRef.current = null;
    }
  };

  const activeCourse = CHESS_COURSES.find((c) => c.id === activeCourseId) || CHESS_COURSES[0];
  const totalLessons = useMemo(
    () => CHESS_COURSES.reduce((sum, c) => sum + c.lessons.length, 0),
    []
  );

  const getInitialLessonChess = useCallback((lesson: ChessLesson) => {
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
    return newChess;
  }, []);

  // Initialize or reset lesson board
  const loadLesson = useCallback(
    (lesson: ChessLesson) => {
      clearRevertTimer();
      setActiveLesson(lesson);
      const newChess = getInitialLessonChess(lesson);
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
    },
    [getInitialLessonChess]
  );

  useEffect(() => {
    if (initialContext?.subTab) {
      setSubTab(initialContext.subTab);
    }
    if (initialContext?.courseId) {
      setSubTab('lessons');
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
    return () => clearRevertTimer();
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

      const expected = activeLesson.task.expectedMoves;
      const playedSan = result.san;

      const isMatch = expected.some((m) => {
        const cleanExp = m.replace(/[+#]/g, '');
        const cleanPlayed = playedSan.replace(/[+#]/g, '');
        return cleanExp === cleanPlayed;
      });

      if (isMatch) {
        clearRevertTimer();
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

        const updated = StorageService.markLessonCompleted(activeLesson.id);
        onUpdateStats(updated);
      } else {
        setExerciseStatus('failed');
        const failText = `${playedSan} is not the target move. Review the objective ("${activeLesson.task.instruction}") and try again!`;
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

        // Automatically revert the board after 750ms so the user can immediately try again
        clearRevertTimer();
        const currentLesson = activeLesson;
        revertTimerRef.current = window.setTimeout(() => {
          const restored = getInitialLessonChess(currentLesson);
          setChess(restored);
          setLastMove(null);
          setExerciseStatus('pending');
        }, 750);
      }
    } catch {
      // Illegal move
    }
  };

  // Play demonstration moves
  const handlePlayDemo = async () => {
    if (
      !activeLesson ||
      !activeLesson.demoMoves ||
      activeLesson.demoMoves.length === 0 ||
      isDemoRunning
    )
      return;

    clearRevertTimer();
    setIsDemoRunning(true);
    setExerciseStatus('pending');
    setFeedbackMessage('Playing demonstration sequence...');

    const demoChess = getInitialLessonChess(activeLesson);
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
    setFeedbackMessage('Demonstration complete! Now solve the interactive board task.');
  };

  const handleResetLesson = () => {
    if (activeLesson) {
      loadLesson(activeLesson);
    }
  };

  const handleNextLesson = () => {
    if (!activeLesson) return;
    const allCourseLessons = activeCourse.lessons;
    const currentIndex = allCourseLessons.findIndex((l) => l.id === activeLesson.id);
    if (currentIndex < allCourseLessons.length - 1) {
      loadLesson(allCourseLessons[currentIndex + 1]);
    }
  };

  const filteredCourseLessons = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return activeCourse.lessons;
    return activeCourse.lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
    );
  }, [activeCourse.lessons, searchFilter]);

  return (
    <div className="space-y-4">
      {/* Top Sub-Navigation Switcher: Lessons | Opening Explorer | Coach Sandbox */}
      <div className="px-4 sm:px-6 pt-4 max-w-[1520px] mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#111624] border border-white/10">
          <button
            type="button"
            onClick={() => setSubTab('lessons')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'lessons'
                ? 'bg-emerald-500 text-[#070a12]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Lessons ({stats.lessonsCompleted.length}/{totalLessons})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('openings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'openings'
                ? 'bg-emerald-500 text-[#070a12]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Opening Explorer</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('practice')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              subTab === 'practice'
                ? 'bg-emerald-500 text-[#070a12]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Coach Sandbox</span>
          </button>
        </div>
      </div>

      {subTab === 'openings' && <OpeningsPage settings={settings} />}

      {subTab === 'practice' && (
        <PracticePage
          settings={settings}
          onNavigate={onNavigate || (() => setSubTab('lessons'))}
        />
      )}

      {subTab === 'lessons' && (
        <div className="px-4 sm:px-6 pb-6 space-y-5 max-w-[1520px] mx-auto">
          {/* Course Level Selector + Search */}
          <section className="rounded-2xl bg-[#111624] border border-white/[0.08] p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
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
                    className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all border ${
                      isActive
                        ? 'bg-emerald-500 text-[#070a12] border-emerald-400'
                        : 'bg-[#171c2b] text-slate-300 hover:text-white hover:bg-[#1f2638] border-white/[0.06]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span>{course.icon}</span>
                      <span className="truncate">
                        L{course.levelNumber}:{' '}
                        {course.id.charAt(0).toUpperCase() + course.id.slice(1)}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                        isActive
                          ? 'bg-[#070a12]/20 text-[#070a12] font-extrabold'
                          : 'bg-[#0a0e18] text-slate-400'
                      }`}
                    >
                      {completedCount}/{course.lessons.length}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter lessons..."
                className="w-full bg-[#0a0e18] border border-white/10 focus:border-emerald-500/50 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </section>

          {/* Main Interactive Lesson Studio Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column (4 Cols): Lesson Navigation List & Grandmaster Coach */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#111624] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 min-w-0">
                    <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{activeCourse.title}</span>
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0 whitespace-nowrap">
                    {activeCourse.levelElo} ELO
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                  {filteredCourseLessons.map((lesson, idx) => {
                    const isSelected = activeLesson?.id === lesson.id;
                    const isCompleted = stats.lessonsCompleted.includes(lesson.id);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => loadLesson(lesson)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-2 border ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                            : 'bg-[#171c2b] border-white/[0.05] text-slate-300 hover:border-white/15 hover:bg-[#1f2638]'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <span
                            className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500 text-[#070a12]'
                                : 'bg-[#0a0e18] text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="text-xs font-bold truncate">{lesson.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {lesson.description}
                            </div>
                          </div>
                        </div>

                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-slate-600 shrink-0" />
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

            {/* Right Column (8 Cols): Interactive Board & Lesson Exercise Stage */}
            <div className="lg:col-span-8">
              {activeLesson ? (
                <div className="bg-[#111624] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5">
                  {/* Lesson Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                          Module{' '}
                          {activeCourse.lessons.findIndex((l) => l.id === activeLesson.id) + 1} of{' '}
                          {activeCourse.lessons.length}
                        </span>
                        {stats.lessonsCompleted.includes(activeLesson.id) && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                            <Award className="w-3 h-3" /> Completed
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight mt-1">
                        {activeLesson.title}
                      </h2>
                    </div>

                    {/* Lesson Controls */}
                    <div className="flex items-center gap-2">
                      {activeLesson.demoMoves && activeLesson.demoMoves.length > 0 && (
                        <button
                          type="button"
                          onClick={handlePlayDemo}
                          disabled={isDemoRunning}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-100 text-xs font-bold border border-white/10 disabled:opacity-40 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                          <span>Watch Demo</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleResetLesson}
                        className="p-2 rounded-xl bg-[#171c2b] hover:bg-[#1f2638] text-slate-400 hover:text-white border border-white/10 transition-colors"
                        title="Reset Exercise"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Lesson Concept Explanation */}
                  <div className="p-4 rounded-xl bg-[#0a0e18] border border-white/[0.07] text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {activeLesson.instruction}
                  </div>

                  {/* Interactive Board & Task Panel */}
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start justify-center">
                    {/* Chessboard Container */}
                    <div className="w-full max-w-[460px] aspect-square flex items-center justify-center">
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
                      <div className="p-4 rounded-xl bg-[#171c2b] border border-white/[0.08] space-y-2">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono block">
                          Board Objective
                        </span>
                        <p className="text-sm font-semibold text-slate-100 leading-snug">
                          {activeLesson.task.instruction}
                        </p>
                      </div>

                      {/* Feedback Message */}
                      {feedbackMessage && (
                        <div
                          className={`p-4 rounded-xl text-xs font-medium leading-relaxed animate-in fade-in ${
                            exerciseStatus === 'success'
                              ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200'
                              : exerciseStatus === 'failed'
                              ? 'bg-rose-500/15 border border-rose-500/40 text-rose-200'
                              : 'bg-[#0a0e18] border border-white/10 text-slate-300'
                          }`}
                        >
                          {feedbackMessage}
                        </div>
                      )}

                      {/* Next Lesson Action */}
                      {exerciseStatus === 'success' && (
                        <button
                          type="button"
                          onClick={handleNextLesson}
                          className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#070a12] font-extrabold text-xs flex items-center justify-center gap-2 transition-colors"
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
      )}
    </div>
  );
};
