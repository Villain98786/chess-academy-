import { Color } from 'chess.js';
import { CourseLevelId, GameMove } from '../types/chess';
import {
  calculateColorAccuracy,
  detectCriticalMoments,
  identifyOpeningFromMoves,
} from './analytics';
import { CHESS_COURSES } from '../data/lessons';

export interface RecommendedCurriculumLesson {
  lessonId: string;
  courseId: CourseLevelId;
  levelNumber: number;
  title: string;
  reason: string;
}

export interface StructuredGameReview {
  result: 'win' | 'loss' | 'draw';
  reason: string;
  openingEco: string;
  openingName: string;
  userAccuracy: number;
  opponentAccuracy: number;
  counts: {
    brilliant: number;
    great: number;
    best: number;
    excellent: number;
    good: number;
    inaccuracy: number;
    missed_win: number;
    mistake: number;
    blunder: number;
  };
  phasePerformance: {
    openingScore: number;
    tacticalScore: number;
    endgameScore: number;
    openingGrade: string;
    tacticalGrade: string;
    endgameGrade: string;
  };
  criticalPlies: number[];
  weaknessesIdentified: string[];
  recommendedLessons: RecommendedCurriculumLesson[];
  coachSummary: string;
}

function scoreToGrade(score: number): string {
  if (score >= 93) return 'A+ (Masterful)';
  if (score >= 85) return 'A (Strong)';
  if (score >= 75) return 'B (Solid)';
  if (score >= 62) return 'C (Needs Polish)';
  return 'D (Focus Area)';
}

/**
 * Generates a complete post-game Grandmaster Coach Review (PART 13).
 */
export function generateStructuredGameReview(params: {
  moves: GameMove[];
  playerColor: Color;
  result: 'win' | 'loss' | 'draw';
  reason: string;
}): StructuredGameReview {
  const { moves, playerColor, result, reason } = params;
  const opponentColor: Color = playerColor === 'w' ? 'b' : 'w';

  const opening = identifyOpeningFromMoves(moves);
  const userAccuracy = calculateColorAccuracy(moves, playerColor);
  const opponentAccuracy = calculateColorAccuracy(moves, opponentColor);

  const counts = {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    missed_win: 0,
    mistake: 0,
    blunder: 0,
  };

  const userMoves = moves.filter((m) => m.color === playerColor);
  for (const m of userMoves) {
    const cls = m.classification || 'good';
    counts[cls] = (counts[cls] || 0) + 1;
  }

  // Phase slicing (Opening = plies 0..15, Tactical/Middlegame = plies 16..45, Endgame = plies 46+)
  const openingMoves = moves.slice(0, 16);
  const middlegameMoves = moves.length > 16 ? moves.slice(16, 46) : moves;
  const endgameMoves = moves.length > 46 ? moves.slice(46) : moves.slice(-Math.min(8, moves.length));

  const openingScore = calculateColorAccuracy(openingMoves, playerColor);
  const tacticalScore = calculateColorAccuracy(middlegameMoves, playerColor);
  const endgameScore = calculateColorAccuracy(endgameMoves, playerColor);

  const criticalPlies = detectCriticalMoments(moves);

  // Identify recurring weaknesses & recommend matching curriculum lessons
  const weaknessesIdentified: string[] = [];
  const recommendedLessonIds = new Set<string>();
  const recommendedLessons: RecommendedCurriculumLesson[] = [];

  const addLesson = (lessonId: string, why: string) => {
    if (recommendedLessonIds.has(lessonId)) return;
    for (const course of CHESS_COURSES) {
      const found = course.lessons.find((l) => l.id === lessonId);
      if (found) {
        recommendedLessonIds.add(lessonId);
        recommendedLessons.push({
          lessonId: found.id,
          courseId: course.id,
          levelNumber: course.levelNumber,
          title: found.title,
          reason: why,
        });
        return;
      }
    }
  };

  if (counts.blunder > 0) {
    weaknessesIdentified.push(
      `Threat Awareness & Hanging Pieces (${counts.blunder} blunder${
        counts.blunder > 1 ? 's' : ''
      })`
    );
    addLesson(
      'beg-3',
      'Eliminate one-move blunders by checking undefended pieces and capture values.'
    );
    addLesson(
      'int-7',
      'Strengthen defensive awareness against back-rank and deflection tactics.'
    );
  }

  if (counts.missed_win > 0 || counts.mistake > 0) {
    weaknessesIdentified.push(
      `Tactical Calculation & Double Attacks (${
        counts.missed_win + counts.mistake
      } missed opportunities/mistakes)`
    );
    addLesson(
      'int-2',
      'Spot Knight forks and double attacks before your opponent can consolidate.'
    );
    addLesson(
      'mas-1',
      'Structure calculation using Candidate Moves (Checks, Captures, Threats).'
    );
  }

  if (openingScore < 82) {
    weaknessesIdentified.push('Opening Piece Development & King Safety');
    addLesson(
      'beg-5',
      'Prioritize early kingside castling to protect your king before central files open.'
    );
    addLesson(
      'int-1',
      'Contest the center squares and develop Knights and Bishops with tempo.'
    );
  }

  if (endgameScore < 80 && moves.length >= 24) {
    weaknessesIdentified.push('Endgame Conversion & Rook Activity');
    addLesson(
      'adv-2',
      'Master the Lucena Bridge and Rook positioning to convert endgame advantages.'
    );
  }

  if (weaknessesIdentified.length === 0) {
    weaknessesIdentified.push('Advanced Positional Imbalances & Prophylaxis');
    addLesson(
      'adv-1',
      'Anchor Knights on permanent central outposts to squeeze equal positions.'
    );
    addLesson(
      'mas-2',
      'Use strategic exchanges and dynamic imbalances to outplay strong opponents.'
    );
  }

  const strongCount = counts.brilliant + counts.great + counts.best + counts.excellent;
  const coachSummary =
    result === 'win'
      ? `Well-earned victory (${userAccuracy}% accuracy)! You played ${strongCount} strong engine-level moves in the ${opening.name}.`
      : result === 'draw'
      ? `Hard-fought draw (${userAccuracy}% accuracy) in the ${opening.name}. Reviewing the ${criticalPlies.length} critical moments will help convert this next time.`
      : `Good effort (${userAccuracy}% accuracy) in the ${opening.name}. Focus on the ${criticalPlies.length} critical turning points and the recommended lessons below to sharpen your play.`;

  return {
    result,
    reason,
    openingEco: opening.eco,
    openingName: opening.name,
    userAccuracy,
    opponentAccuracy,
    counts,
    phasePerformance: {
      openingScore,
      tacticalScore,
      endgameScore,
      openingGrade: scoreToGrade(openingScore),
      tacticalGrade: scoreToGrade(tacticalScore),
      endgameGrade: scoreToGrade(endgameScore),
    },
    criticalPlies,
    weaknessesIdentified,
    recommendedLessons: recommendedLessons.slice(0, 3),
    coachSummary,
  };
}
