import { ChessPuzzle } from '../types/chess';

export const CHESS_PUZZLES: ChessPuzzle[] = [
  // ============================================================================
  // MATE IN 2 (Featured first so default view immediately demonstrates multi-move solving)
  // ============================================================================
  {
    id: 'puz-m2-1',
    category: 'mate2',
    title: "Anastasia's Corridor",
    theme: 'Mate in 2: Knight & Rook Net',
    difficulty: 'Intermediate',
    rating: 1100,
    fen: '5rk1/1p3pp1/8/3N4/8/4R3/2B2PPP/6K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    mateDepth: 2,
    solutionMoves: ['Ne7+', 'Kh8', 'Rh3#'],
    opponentExplanations: {
      1: 'Forced move: Black must play 1...Kh8 because f8, f7, and g7 are blocked by Black pieces and h7 is controlled by your c2 Bishop.',
    },
    wrongMoveExplanations: {
      Rh3: '1. Rh3 threatens mate on h7, but without checking first, Black has time to play 1...f5 or 1...g6 and escape.',
      'Bxh7+': '1. Bxh7+ Kxh7 gives up your dark-squared bishop and allows the Black King to escape via g8.',
    },
    hint: 'First jump your Knight to e7 with check to force the Black King into the h8 corner, then swing your Rook to the h-file.',
    explanation:
      "1. Ne7+ forces 1...Kh8 (since the c2 Bishop covers h7), and 2. Rh3# delivers Anastasia's Mate along the h-file while the Knight seals g8.",
  },
  {
    id: 'puz-m2-2',
    category: 'mate2',
    title: "Morphy's Opera House Finale",
    theme: 'Mate in 2: Deflection Sacrifice',
    difficulty: 'Intermediate',
    rating: 1200,
    fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16',
    playerColor: 'w',
    requiredMovesCount: 2,
    mateDepth: 2,
    solutionMoves: ['Qb8+', 'Nxb8', 'Rd8#'],
    opponentExplanations: {
      1: 'Forced response: Black has no King moves and must capture 1...Nxb8, which deflects the d7-Knight away from guarding d8.',
    },
    wrongMoveExplanations: {
      'Rd8+': '1. Rd8+ is premature because Black’s Knight is still on d7 and simply captures 1...Nxd8.',
      Qxb7: '1. Qxb7 wins a pawn, but misses the forced Mate in 2 via Queen sacrifice on b8!',
    },
    hint: 'The d7-Knight is the only piece guarding d8. Sacrifice your Queen on b8 with check to deflect that Knight!',
    explanation:
      'From Paul Morphy’s 1858 Opera Game: 1. Qb8+! forces 1...Nxb8, deflecting the d7 defender so 2. Rd8# checkmates the King.',
  },
  {
    id: 'puz-m2-3',
    category: 'mate2',
    title: 'Double Rook Back-Rank Overload',
    theme: 'Mate in 2: Back-Rank Sacrifice',
    difficulty: 'Intermediate',
    rating: 1150,
    fen: 'r1r3k1/5ppp/8/8/8/8/2R2PPP/2R3K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    mateDepth: 2,
    solutionMoves: ['Rxc8+', 'Rxc8', 'Rxc8#'],
    opponentExplanations: {
      1: 'Forced response: Black’s King is trapped by its own pawns on f7, g7, and h7, so Black must recapture with 1...Rxc8.',
    },
    hint: 'Exchange your first Rook on c8 with check so your second Rook on c1 can deliver the decisive back-rank mate.',
    explanation:
      '1. Rxc8+ forces Black’s a8 defender to recapture 1...Rxc8, and 2. Rxc8# finishes the back-rank checkmate.',
  },

  // ============================================================================
  // MATE IN 1
  // ============================================================================
  {
    id: 'puz-m1-1',
    category: 'mate1',
    title: 'Back Rank Lightning',
    theme: 'Mate in 1: Back Rank Weakness',
    difficulty: 'Beginner',
    rating: 600,
    fen: '6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 1,
    mateDepth: 1,
    solutionMoves: ['Rb8#'],
    hint: "Look at the 8th rank. Black's pawns on f7, g7, and h7 trap their own King with no escape square.",
    explanation: '1. Rb8# delivers a classic back-rank checkmate because Black has no luft (escape square).',
  },
  {
    id: 'puz-m1-2',
    category: 'mate1',
    title: 'Open E-File Execution',
    theme: 'Mate in 1: Back Rank Corridor',
    difficulty: 'Beginner',
    rating: 650,
    fen: 'r1b3k1/ppp2ppp/8/8/8/8/PPPP1PPP/RNBQR1K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 1,
    mateDepth: 1,
    solutionMoves: ['Re8#'],
    hint: 'Black has left the e8 square unguarded while the King is boxed in on g8. Slide your Rook to the 8th rank.',
    explanation: '1. Re8# checkmates the trapped Black King immediately along the back rank.',
  },
  {
    id: 'puz-m1-3',
    category: 'mate1',
    title: "Scholar's Battery Sting",
    theme: 'Mate in 1: f7 Vulnerability',
    difficulty: 'Beginner',
    rating: 700,
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    playerColor: 'w',
    requiredMovesCount: 1,
    mateDepth: 1,
    solutionMoves: ['Qxf7#'],
    hint: "The f7 pawn is defended only by Black's King, while your Queen on f3 is supported by the Bishop on c4.",
    explanation: '1. Qxf7# checkmates immediately. The Black King cannot capture the Queen because of the c4 Bishop.',
  },

  // ============================================================================
  // MATE IN 3
  // ============================================================================
  {
    id: 'puz-m3-1',
    category: 'mate3',
    title: "Philidor's Smothered Legacy",
    theme: 'Mate in 3: Double Check & Queen Sacrifice',
    difficulty: 'Advanced',
    rating: 1550,
    fen: 'r4rk1/ppp2Npp/8/8/8/1Q6/PPP2PPP/6K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 3,
    mateDepth: 3,
    solutionMoves: ['Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
    opponentExplanations: {
      1: 'Forced move: 1. Nh6+ is a double check from both the Knight and the b3 Queen, forcing the Black King into the h8 corner.',
      3: 'Forced move: The Black King cannot capture on g8 because the h6 Knight protects the Queen, so Black must play 2...Rxg8, blocking the King’s last square!',
    },
    wrongMoveExplanations: {
      'Nd6+': '1. Nd6+ is a discovered check, but Black can simply capture 1...cxd6 or interpose 1...Rf7.',
      'Qg8+': '1. Qg8+ immediately fails because the Black King on g8 is not prevented from capturing 1...Kxg8!',
    },
    hint: 'Start with a double check (1. Nh6+) to force the King to h8, then sacrifice your Queen on g8 to smother the King!',
    explanation:
      "Philidor's immortal smothered mate: 1. Nh6+ Kh8 2. Qg8+! Rxg8 (forced) 3. Nf7# traps the King behind its own pieces.",
  },
  {
    id: 'puz-m3-2',
    category: 'mate3',
    title: 'Grand Opera Clearance Combination',
    theme: 'Mate in 3: Double Deflection Sacrifice',
    difficulty: 'Advanced',
    rating: 1600,
    fen: '4kb1r/p2b1ppp/4pn2/1B2p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 15',
    playerColor: 'w',
    requiredMovesCount: 3,
    mateDepth: 3,
    solutionMoves: ['Bxd7+', 'Nxd7', 'Qb8+', 'Nxb8', 'Rd8#'],
    opponentExplanations: {
      1: 'Forced response: Black’s King has no legal moves (d8 and e7 are covered by your g5 Bishop), so Black must recapture 1...Nxd7.',
      3: 'Forced response: Again the King cannot move, forcing 2...Nxb8 and leaving the d8 square completely undefended!',
    },
    hint: 'Eliminate the d7 Bishop with check first (1. Bxd7+), then sacrifice your Queen on b8 to deflect the Knight from d8!',
    explanation:
      '1. Bxd7+ Nxd7 2. Qb8+! Nxb8 3. Rd8# systematically strips away both defenders of the d8 square for checkmate.',
  },

  // ============================================================================
  // MATE IN 4+
  // ============================================================================
  {
    id: 'puz-m4-1',
    category: 'mate4',
    title: 'Full 4-Move Smothered Windmill',
    theme: 'Mate in 4: Complete Philidor Sequence',
    difficulty: 'Master',
    rating: 1850,
    fen: '4r2k/ppp3pp/8/4N3/8/BQ6/PPP2PPP/6K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 4,
    mateDepth: 4,
    solutionMoves: ['Nf7+', 'Kg8', 'Nh6+', 'Kh8', 'Qg8+', 'Rxg8', 'Nf7#'],
    opponentExplanations: {
      1: 'Forced response: Black has no piece that can capture the f7 Knight, so the King is forced out to g8.',
      3: 'Forced response: Double check from both Knight and Queen (with f8 covered by your a3 Bishop) forces the Black King back into the h8 corner.',
      5: 'Forced response: Because the h6 Knight defends g8, the Black King cannot capture the Queen and Black must play 3...Rxg8, self-blocking g8!',
    },
    hint: 'Begin the 4-move smothered mate machine with 1. Nf7+ Kg8, followed by 2. Nh6+ Kh8, 3. Qg8+! Rxg8, and 4. Nf7#.',
    explanation:
      'The complete 4-move (7-ply) Philidor Smothered Mate: 1. Nf7+ Kg8 2. Nh6+ Kh8 3. Qg8+! Rxg8 4. Nf7#.',
  },

  // ============================================================================
  // FORK
  // ============================================================================
  {
    id: 'puz-fork-1',
    category: 'fork',
    title: 'The Royal Knight Fork',
    theme: 'Fork: Decoy Into King & Queen Fork',
    difficulty: 'Intermediate',
    rating: 1150,
    fen: '2kr3r/ppp2ppp/8/3N4/8/8/PPP2PPP/2KR3R w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['Ne7+', 'Kb8', 'Rxd8+'],
    opponentExplanations: {
      1: 'Forced King move: After 1. Ne7+ forks the King and the d8 square, Black steps aside with 1...Kb8, allowing you to win the d8 Rook with check.',
    },
    hint: 'Use your central Knight to deliver a forcing check on e7 before capturing the undefended Rook on d8.',
    explanation:
      '1. Ne7+ forces the King to b8 while disrupting coordination, and 2. Rxd8+ wins a full Rook with check.',
  },
  {
    id: 'puz-fork-2',
    category: 'fork',
    title: 'Central Liquidation Fork',
    theme: 'Fork: Queen & King Family Fork Setup',
    difficulty: 'Beginner',
    rating: 980,
    fen: 'r1bqk2r/pppp1ppp/2n5/2b1p3/2B1n3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['dxe4', 'Bxf2+', 'Kxf2'],
    opponentExplanations: {
      1: 'Desperado check: Having lost the e4 Knight, Black tries 1...Bxf2+ to disturb your King, which you cleanly recapture.',
    },
    hint: "Black's Knight on e4 is hanging! Capture it with your d3-pawn, then recapture Black's desperado Bishop on f2.",
    explanation:
      '1. dxe4 wins a full minor piece, and after Black’s desperation 1...Bxf2+, 2. Kxf2 leaves White a clean piece ahead.',
  },

  // ============================================================================
  // PIN
  // ============================================================================
  {
    id: 'puz-pin-1',
    category: 'pin',
    title: 'Exploiting the Absolute Pin',
    theme: 'Pin: Piling Up on a Pinned Piece',
    difficulty: 'Intermediate',
    rating: 1200,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 4 5',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['Nd5', 'Nxd5', 'Bxd5'],
    opponentExplanations: {
      1: 'Black exchanges the active central Knight on d5 to relieve pressure, allowing your Bishop to recapture on a dominant diagonal.',
    },
    hint: 'Jump your Knight to the powerful d5 outpost to pressure Black’s Knight on f6 and Bishop on b4.',
    explanation:
      '1. Nd5 seizes the central outpost, and after 1...Nxd5 2. Bxd5 White dominates the center and pressures c6 and f7.',
  },

  // ============================================================================
  // SKEWER
  // ============================================================================
  {
    id: 'puz-skewer-1',
    category: 'skewer',
    title: 'Diagonal X-Ray Skewer',
    theme: 'Skewer: Long Diagonal King & Rook Skewer',
    difficulty: 'Intermediate',
    rating: 1250,
    fen: '7r/8/5k2/8/3P1B2/8/5PPP/6K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['Be5+', 'Kf7', 'Bxh8'],
    opponentExplanations: {
      1: 'Forced King move: Because your e5 Bishop is protected by the d4 pawn, Black’s King cannot capture it and must step aside with 1...Kf7, exposing the h8 Rook!',
    },
    hint: 'Play 1. Be5+ (protected by your d4 pawn) to skewer Black’s King on f6 and the undefended Rook behind it on h8!',
    explanation:
      '1. Be5+! skewers the Black King and Rook along the a1-h8 diagonal. After 1...Kf7, 2. Bxh8 wins the Rook cleanly.',
  },

  // ============================================================================
  // DISCOVERED ATTACK
  // ============================================================================
  {
    id: 'puz-disc-1',
    category: 'discovered',
    title: 'Unveiling the Battery',
    theme: 'Discovered Attack: Winning Material with Tempo',
    difficulty: 'Intermediate',
    rating: 1250,
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4P3/1b6/2N2N2/PPP1PPPP/R1BQKB1R w KQkq - 1 5',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['exf6', 'Bxc3+', 'bxc3'],
    opponentExplanations: {
      1: 'Black plays 1...Bxc3+ as an intermediate check before dealing with the f6 pawn, so you recapture 2. bxc3.',
    },
    hint: 'Capture the hanging Knight on f6 immediately, then recapture when Black trades on c3.',
    explanation:
      '1. exf6 wins the f6 Knight cleanly, and after 1...Bxc3+ 2. bxc3 White emerges with a decisive material advantage.',
  },

  // ============================================================================
  // DOUBLE ATTACK
  // ============================================================================
  {
    id: 'puz-dbl-1',
    category: 'double_attack',
    title: 'Queen Geometry Double Strike',
    theme: 'Double Attack: Simultaneous Check & Rook Capture',
    difficulty: 'Intermediate',
    rating: 1300,
    fen: 'r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['Qd5+', 'Kh8', 'Qxa8+'],
    opponentExplanations: {
      1: 'Forced King move: Because 1. Qd5+ delivers check along the a2-g8 diagonal, Black must step out of check with 1...Kh8, leaving the a8 Rook undefended!',
    },
    hint: 'Centralize your Queen to d5 where it simultaneously checks the Black King on g8 and attacks the undefended Rook on a8!',
    explanation:
      '1. Qd5+! forks the Black King on g8 and the Rook on a8. After 1...Kh8, 2. Qxa8+ wins the Rook with check.',
  },

  // ============================================================================
  // DEFENSIVE TACTICS
  // ============================================================================
  {
    id: 'puz-def-1',
    category: 'defensive',
    title: 'Surviving the Back-Rank Crisis',
    theme: 'Defensive Tactics: Trading & Creating Luft',
    difficulty: 'Intermediate',
    rating: 1180,
    fen: 'r2r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    solutionMoves: ['Rxd8+', 'Rxd8', 'h3'],
    opponentExplanations: {
      1: 'Forced recapture: Black plays 1...Rxd8 with the a8 Rook and now threatens an immediate back-rank checkmate on d1!',
    },
    wrongMoveExplanations: {
      Kf1: '1. Kf1 leaves both Black rooks on the board and surrenders the open d-file without trading first.',
    },
    hint: 'First eliminate one of Black’s rooks with 1. Rxd8+ Rxd8, then create an escape square (2. h3) to stop Black’s 2...Rd1# mate threat!',
    explanation:
      '1. Rxd8+ Rxd8 simplifies one attacker, and 2. h3 creates crucial luft so Black’s 2...Rd1+ is no longer checkmate.',
  },

  // ============================================================================
  // DAILY CHALLENGE
  // ============================================================================
  {
    id: 'puz-daily',
    category: 'daily',
    title: "Daily Challenge: Boden's Criss-Cross Mate",
    theme: 'Daily Challenge: Mate in 2 Queen Sacrifice',
    difficulty: 'Advanced',
    rating: 1450,
    fen: '2kr3r/pp1b1ppp/2p5/8/5B2/3B1Q2/PPP2PPP/2KR3R w - - 0 1',
    playerColor: 'w',
    requiredMovesCount: 2,
    mateDepth: 2,
    solutionMoves: ['Qxc6+', 'bxc6', 'Ba6#'],
    opponentExplanations: {
      1: 'Forced capture: Because your f4 Bishop controls b8 and c7, Black’s King cannot move and Black must play 1...bxc6, opening the a6-c8 diagonal!',
    },
    wrongMoveExplanations: {
      Ba6: '1. Ba6 is blocked because Black still has a pawn on b7! Sacrifice on c6 first to decoy the b7 pawn.',
    },
    hint: 'Sacrifice your Queen on c6 with check to decoy Black’s b7 pawn and open the lethal a6-c8 diagonal for your d3 Bishop!',
    explanation:
      "Classic Boden's Mate: 1. Qxc6+! forces 1...bxc6, clearing the b7 square so 2. Ba6# checkmates the King with crisscrossing Bishops.",
  },
];
