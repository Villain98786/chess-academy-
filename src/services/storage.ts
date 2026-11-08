import { AppSettings, GameRecord, UserStats, EloHistoryPoint } from '../types/chess';
import { calculateColorAccuracy } from './analytics';

const STATS_KEY = 'ai_chess_academy_stats_v2';
const SETTINGS_KEY = 'ai_chess_academy_settings';

const DEFAULT_SETTINGS: AppSettings = {
  boardTheme: 'emerald',
  pieceTheme: 'classic',
  soundEnabled: true,
  soundVolume: 0.6,
  showLegalMoves: true,
  showCoordinates: true,
  autoQueen: true,
  showEvalBar: true,
  engineDepth: 4,
};

const SEED_GAMES: GameRecord[] = [
  {
    id: 'seed-game-1',
    date: 'Today',
    playerColor: 'w',
    opponent: 'Intermediate (Knight)',
    opponentElo: 1000,
    result: 'win',
    reason: 'Checkmate',
    userAccuracy: 94,
    opponentAccuracy: 76,
    initialTimeMinutes: 10,
    moves: [
      { from: 'e2', to: 'e4', san: 'e4', piece: 'p', color: 'w', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', evalScore: 25, classification: 'best' },
      { from: 'e7', to: 'e5', san: 'e5', piece: 'p', color: 'b', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', evalScore: 20, classification: 'best' },
      { from: 'g1', to: 'f3', san: 'Nf3', piece: 'n', color: 'w', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', evalScore: 35, classification: 'best' },
      { from: 'b8', to: 'c6', san: 'Nc6', piece: 'n', color: 'b', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', evalScore: 30, classification: 'best' },
      { from: 'f1', to: 'c4', san: 'Bc4', piece: 'b', color: 'w', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', evalScore: 45, classification: 'best' },
      { from: 'f8', to: 'c5', san: 'Bc5', piece: 'b', color: 'b', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', evalScore: 40, classification: 'good' },
      { from: 'd1', to: 'f3', san: 'Qf3', piece: 'q', color: 'w', fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 5 4', evalScore: 15, classification: 'good' },
      { from: 'd7', to: 'd6', san: 'd6', piece: 'p', color: 'b', fen: 'r1bqk1nr/ppp2ppp/2np4/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 5', evalScore: 100000, classification: 'blunder' },
      { from: 'f3', to: 'f7', san: 'Qxf7#', piece: 'q', color: 'w', captured: 'p', fen: 'r1bqk1nr/ppp2Qpp/2np4/2b1p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 5', evalScore: 100000, classification: 'brilliant' },
    ],
  },
  {
    id: 'seed-game-2',
    date: 'Yesterday',
    playerColor: 'b',
    opponent: 'Easy (Cadet)',
    opponentElo: 600,
    result: 'win',
    reason: 'Opponent Resigned',
    userAccuracy: 91,
    opponentAccuracy: 68,
    initialTimeMinutes: 5,
    moves: [
      { from: 'd2', to: 'd4', san: 'd4', piece: 'p', color: 'w', fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1', evalScore: 20, classification: 'best' },
      { from: 'g8', to: 'f6', san: 'Nf6', piece: 'n', color: 'b', fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2', evalScore: 15, classification: 'best' },
      { from: 'c2', to: 'c4', san: 'c4', piece: 'p', color: 'w', fen: 'rnbqkb1r/pppppppp/5n2/8/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2', evalScore: 25, classification: 'best' },
      { from: 'e7', to: 'e6', san: 'e6', piece: 'p', color: 'b', fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3', evalScore: 20, classification: 'best' },
      { from: 'b1', to: 'c3', san: 'Nc3', piece: 'n', color: 'w', fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3', evalScore: 25, classification: 'good' },
      { from: 'f8', to: 'b4', san: 'Bb4', piece: 'b', color: 'b', fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4', evalScore: 10, classification: 'best' },
    ],
  },
  {
    id: 'seed-game-3',
    date: '2 days ago',
    playerColor: 'w',
    opponent: 'Advanced (Bishop)',
    opponentElo: 1400,
    result: 'draw',
    reason: 'Mutual Agreement',
    userAccuracy: 88,
    opponentAccuracy: 89,
    initialTimeMinutes: 10,
    moves: [
      { from: 'e2', to: 'e4', san: 'e4', piece: 'p', color: 'w', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', evalScore: 25, classification: 'best' },
      { from: 'c7', to: 'c5', san: 'c5', piece: 'p', color: 'b', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2', evalScore: 20, classification: 'best' },
      { from: 'g1', to: 'f3', san: 'Nf3', piece: 'n', color: 'w', fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', evalScore: 30, classification: 'best' },
      { from: 'd7', to: 'd6', san: 'd6', piece: 'p', color: 'b', fen: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3', evalScore: 25, classification: 'best' },
    ],
  },
];

const SEED_ELO_HISTORY: EloHistoryPoint[] = [
  { label: 'Day 1', rapid: 800, puzzle: 850, estimated: 820 },
  { label: 'Day 2', rapid: 830, puzzle: 890, estimated: 854 },
  { label: 'Day 3', rapid: 865, puzzle: 925, estimated: 889 },
  { label: 'Day 4', rapid: 890, puzzle: 960, estimated: 918 },
  { label: 'Today', rapid: 925, puzzle: 995, estimated: 953 },
];

const DEFAULT_STATS: UserStats = {
  estimatedElo: 953,
  rapidElo: 925,
  blitzElo: 880,
  puzzleElo: 995,
  gamesPlayed: 3,
  wins: 2,
  losses: 0,
  draws: 1,
  puzzlesSolved: 6,
  puzzlesAttempted: 7,
  lessonsCompleted: ['beg-1', 'beg-2', 'beg-3'],
  dailyStreak: 4,
  lastActiveDate: new Date().toISOString().split('T')[0],
  practiceTimeMinutes: 42,
  recentGames: SEED_GAMES,
  eloHistory: SEED_ELO_HISTORY,
};

export class StorageService {
  public static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_SETTINGS;
  }

  public static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }

  public static getStats(): UserStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const stats: UserStats = {
          ...DEFAULT_STATS,
          ...parsed,
          eloHistory:
            Array.isArray(parsed.eloHistory) && parsed.eloHistory.length > 0
              ? parsed.eloHistory
              : SEED_ELO_HISTORY,
          recentGames:
            Array.isArray(parsed.recentGames) && parsed.recentGames.length > 0
              ? parsed.recentGames
              : SEED_GAMES,
        };
        const today = new Date().toISOString().split('T')[0];
        if (stats.lastActiveDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          if (stats.lastActiveDate === yesterday) {
            stats.dailyStreak += 1;
          } else {
            stats.dailyStreak = Math.max(1, stats.dailyStreak);
          }
          stats.lastActiveDate = today;
          this.saveStats(stats);
        }
        return stats;
      }
    } catch {
      // Ignore
    }
    this.saveStats(DEFAULT_STATS);
    return DEFAULT_STATS;
  }

  public static saveStats(stats: UserStats): void {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch {
      // Ignore
    }
  }

  private static appendEloPoint(stats: UserStats, label: string) {
    const history = [...(stats.eloHistory || SEED_ELO_HISTORY)];
    history.push({
      label,
      rapid: stats.rapidElo,
      puzzle: stats.puzzleElo,
      estimated: stats.estimatedElo,
    });
    stats.eloHistory = history.slice(-10);
  }

  public static recordGame(game: GameRecord): UserStats {
    const stats = this.getStats();
    stats.gamesPlayed += 1;

    const isBlitz = (game.initialTimeMinutes ?? 10) <= 5;

    if (game.result === 'win') {
      stats.wins += 1;
      const eloGain = Math.max(
        10,
        Math.min(35, Math.round((game.opponentElo - stats.rapidElo) * 0.1) + 18)
      );
      stats.rapidElo += eloGain;
      if (isBlitz) stats.blitzElo += eloGain;
    } else if (game.result === 'loss') {
      stats.losses += 1;
      const eloLoss = Math.max(
        8,
        Math.min(28, Math.round((stats.rapidElo - game.opponentElo) * 0.08) + 12)
      );
      stats.rapidElo = Math.max(200, stats.rapidElo - eloLoss);
      if (isBlitz) stats.blitzElo = Math.max(200, stats.blitzElo - eloLoss);
    } else {
      stats.draws += 1;
      const drawDelta = Math.round((game.opponentElo - stats.rapidElo) * 0.04);
      stats.rapidElo = Math.max(200, stats.rapidElo + drawDelta);
    }

    // Compute accuracies if not provided
    const enrichedGame: GameRecord = {
      ...game,
      userAccuracy:
        game.userAccuracy ?? calculateColorAccuracy(game.moves, game.playerColor),
      opponentAccuracy:
        game.opponentAccuracy ??
        calculateColorAccuracy(game.moves, game.playerColor === 'w' ? 'b' : 'w'),
    };

    stats.estimatedElo = Math.round(
      stats.rapidElo * 0.6 + stats.puzzleElo * 0.4 + stats.lessonsCompleted.length * 4
    );
    stats.recentGames = [enrichedGame, ...stats.recentGames.slice(0, 19)];
    this.appendEloPoint(stats, `G${stats.gamesPlayed}`);

    this.saveStats(stats);
    return stats;
  }

  public static recordPuzzleResult(solved: boolean, puzzleRating: number): UserStats {
    const stats = this.getStats();
    stats.puzzlesAttempted += 1;
    if (solved) {
      stats.puzzlesSolved += 1;
      const gain = Math.max(
        8,
        Math.min(26, Math.round((puzzleRating - stats.puzzleElo) * 0.08) + 14)
      );
      stats.puzzleElo += gain;
    } else {
      const loss = Math.max(
        5,
        Math.min(18, Math.round((stats.puzzleElo - puzzleRating) * 0.06) + 8)
      );
      stats.puzzleElo = Math.max(300, stats.puzzleElo - loss);
    }

    stats.estimatedElo = Math.round(
      stats.rapidElo * 0.6 + stats.puzzleElo * 0.4 + stats.lessonsCompleted.length * 4
    );
    this.appendEloPoint(stats, `P${stats.puzzlesAttempted}`);
    this.saveStats(stats);
    return stats;
  }

  public static markLessonCompleted(lessonId: string): UserStats {
    const stats = this.getStats();
    if (!stats.lessonsCompleted.includes(lessonId)) {
      stats.lessonsCompleted.push(lessonId);
      stats.estimatedElo += 12;
      this.appendEloPoint(stats, `L${stats.lessonsCompleted.length}`);
      this.saveStats(stats);
    }
    return stats;
  }

  public static addPracticeTime(minutes: number): UserStats {
    const stats = this.getStats();
    stats.practiceTimeMinutes += minutes;
    this.saveStats(stats);
    return stats;
  }

  public static resetToFresh(): UserStats {
    localStorage.removeItem(STATS_KEY);
    return this.getStats();
  }
}
