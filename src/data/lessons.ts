import { ChessCourse } from '../types/chess';

export const CHESS_COURSES: ChessCourse[] = [
  {
    id: 'beginner',
    levelNumber: 1,
    title: 'Level 1 — Beginner: Foundations & Rules',
    description:
      'Coordinates, piece movement & values, center control, opening principles, development, king safety, castling, checkmate, stalemate, and basic tactics.',
    icon: '🐣',
    levelElo: '400 - 800 Elo',
    lessons: [
      {
        id: 'beg-1',
        courseId: 'beginner',
        conceptKey: 'coordinates_center',
        title: 'Chessboard Coordinates & Center Control',
        description: 'Understand files (a-h), ranks (1-8), and control of the central squares (e4, d4, e5, d5).',
        initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        playerColor: 'w',
        instruction:
          'The chessboard has 64 squares arranged in files (a–h) and ranks (1–8). The four central squares—d4, e4, d5, and e5—are the strategic high ground of the board. Occupying the center gives your pieces maximum mobility.',
        demoMoves: ['e4', 'e5'],
        task: {
          instruction: 'Stake your claim in the center by moving your King’s pawn from e2 to e4.',
          expectedMoves: ['e4'],
          solutionExplanation:
            'Excellent! Playing 1.e4 controls d5 and f5 while opening diagonals for your Queen and light-squared Bishop.',
        },
      },
      {
        id: 'beg-2',
        courseId: 'beginner',
        conceptKey: 'piece_movement_development',
        title: 'Piece Movement & Minor Piece Development',
        description: 'Master how Knights and Bishops develop toward the center in the opening.',
        initialFen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        playerColor: 'w',
        instruction:
          'Knights jump in an L-shape and are the only pieces that can leap over others. Developing Knights toward the center (f3 and c3 for White) attacks central squares and prepares kingside castling.',
        demoMoves: ['Nf3', 'Nc6', 'Bc4'],
        task: {
          instruction: 'Develop your Knight from g1 to f3 to attack Black’s e5 pawn and control d4.',
          expectedMoves: ['Nf3'],
          solutionExplanation:
            'Excellent! Developing your Knight to f3 controls central squares d4 and e5 while preparing kingside castling.',
        },
      },
      {
        id: 'beg-3',
        courseId: 'beginner',
        conceptKey: 'piece_values_captures',
        title: 'Capturing Pieces & Piece Values',
        description: 'Evaluate trades using standard piece values (Pawn=1, Knight/Bishop=3, Rook=5, Queen=9).',
        initialFen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
        playerColor: 'w',
        instruction:
          'Every piece has a material value: Pawn = 1, Knight = 3, Bishop = 3, Rook = 5, Queen = 9. Always capture undefended enemy pieces or trade lower-value pieces for higher-value targets.',
        demoMoves: [],
        task: {
          instruction: 'Capture the undefended Black pawn on d5 with your e4 pawn.',
          expectedMoves: ['exd5'],
          solutionExplanation:
            'Great capture! Your pawn captures diagonally forward onto d5, winning material and opening the e-file.',
        },
      },
      {
        id: 'beg-4',
        courseId: 'beginner',
        conceptKey: 'check_checkmate',
        title: 'Check, Checkmate & Basic Mating Patterns',
        description: 'Understand the difference between check and a game-ending checkmate.',
        initialFen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
        playerColor: 'w',
        instruction:
          'When a King is under direct attack, it is in check and must escape by moving, blocking, or capturing the attacker. When no legal escape exists, it is Checkmate and the game ends immediately.',
        demoMoves: [],
        task: {
          instruction: 'Coordinate your Queen on f3 and Bishop on c4 to deliver checkmate on f7!',
          expectedMoves: ['Qxf7#'],
          solutionExplanation:
            'Checkmate! The Queen attacks the Black King at point-blank range while protected by the c4 Bishop.',
        },
      },
      {
        id: 'beg-5',
        courseId: 'beginner',
        conceptKey: 'king_safety_castling',
        title: 'King Safety & Castling (O-O)',
        description: 'Safeguard your King and activate your Rook in a single move.',
        initialFen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        playerColor: 'w',
        instruction:
          'Leaving your King in the center is dangerous once files open. Castling kingside (O-O) tucks your King behind a protective pawn shield on g1 and brings your h1 Rook toward the center.',
        demoMoves: [],
        task: {
          instruction: 'Castle kingside (O-O) by moving your King from e1 to g1.',
          expectedMoves: ['O-O'],
          solutionExplanation:
            'Superb King safety! Castling secures your monarch and connects your Rooks for the middlegame.',
        },
      },
      {
        id: 'beg-6',
        courseId: 'beginner',
        conceptKey: 'en_passant',
        title: 'En Passant (Capturing in Passing)',
        description: 'Master the special pawn capture rule on the 5th rank.',
        initialFen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
        playerColor: 'w',
        instruction:
          'When an opponent advances a pawn two squares from its starting rank and lands directly beside your advanced pawn, you may capture it "en passant" on the very next turn.',
        demoMoves: [],
        task: {
          instruction: 'Black just played f7–f5. Capture the f5 pawn en passant by moving e5 to f6!',
          expectedMoves: ['exf6'],
          solutionExplanation:
            'Spot on! En passant prevents enemy pawns from bypassing your advanced pawns unscathed.',
        },
      },
      {
        id: 'beg-7',
        courseId: 'beginner',
        conceptKey: 'pawn_promotion',
        title: 'Pawn Promotion & Endgame Conversion',
        description: 'March passed pawns to the 8th rank to crown a new Queen.',
        initialFen: '8/4P3/8/8/8/4k3/8/4K3 w - - 0 1',
        playerColor: 'w',
        instruction:
          'A pawn reaching the 8th rank promotes immediately into a Queen, Rook, Bishop, or Knight. Promoting to a Queen creates decisive material superiority.',
        demoMoves: [],
        task: {
          instruction: 'Advance your e7 pawn to e8 and promote to a Queen with check.',
          expectedMoves: ['e8=Q+'],
          solutionExplanation:
            'Queen promoted! You now have an overwhelming material advantage to finish the game.',
        },
      },
      {
        id: 'beg-8',
        courseId: 'beginner',
        conceptKey: 'stalemate_avoidance',
        title: 'Stalemate & Draw Awareness',
        description: 'Avoid stalemating a lone enemy King when you are winning.',
        initialFen: '7k/5Q2/8/6K1/8/8/8/8 w - - 0 1',
        playerColor: 'w',
        instruction:
          'Stalemate occurs when the side to move is NOT in check but has zero legal moves—resulting in an immediate draw. Always verify the enemy King has a breathing square or deliver direct check.',
        demoMoves: [],
        task: {
          instruction: 'Bring your King closer (Kg6 or Kf6) without stalemating Black’s King on h8.',
          expectedMoves: ['Kg6', 'Kf6'],
          solutionExplanation:
            'Well played! Moving the King to g6 or f6 prepares Qg7# on the next move while avoiding stalemate.',
        },
      },
    ],
  },
  {
    id: 'intermediate',
    levelNumber: 2,
    title: 'Level 2 — Intermediate: Tactical Arsenal',
    description:
      'Forks, pins, skewers, discovered & double attacks, deflection, decoy, removing the defender, zwischenzug, back-rank mates, and basic endgames.',
    icon: '⚔️',
    levelElo: '900 - 1400 Elo',
    lessons: [
      {
        id: 'int-1',
        courseId: 'intermediate',
        conceptKey: 'opening_principles',
        title: 'Opening Principles & Central Tension',
        description: 'Fight for central control, develop with tempo, and avoid premature Queen sorties.',
        initialFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        playerColor: 'b',
        instruction:
          'In the opening, prioritize three pillars: 1) Contest the center with pawns, 2) Develop Knights and Bishops toward active squares, 3) Castle early before launching flank attacks.',
        demoMoves: [],
        task: {
          instruction: 'As Black, challenge White’s central pawn immediately by playing e7–e5.',
          expectedMoves: ['e5'],
          solutionExplanation:
            'Principled response! 1...e5 claims equal central space and frees your dark-squared Bishop.',
        },
      },
      {
        id: 'int-2',
        courseId: 'intermediate',
        conceptKey: 'tactical_fork',
        title: 'The Knight Fork & Double Attack',
        description: 'Attack two enemy targets simultaneously so the opponent cannot save both.',
        initialFen: 'r1b1k2r/pppp1ppp/2n5/4p3/2B1P2q/2N5/PPPP2PP/R1BQ1KNR w kq - 2 6',
        playerColor: 'w',
        instruction:
          'A fork attacks two or more enemy pieces at once. Knights excel at forks because their non-linear jump attacks pieces without being intercepted.',
        demoMoves: [],
        task: {
          instruction: 'Jump your Knight to d5, attacking Black’s Queen threat and threatening a royal fork on c7!',
          expectedMoves: ['Nd5'],
          solutionExplanation:
            'Sharp tactical eye! Nd5 centralizes the Knight and threatens Nxc7+, forking the Black King and a8 Rook.',
        },
      },
      {
        id: 'int-3',
        courseId: 'intermediate',
        conceptKey: 'tactical_pin',
        title: 'Absolute & Relative Pins',
        description: 'Paralyze an enemy defender shielding a more valuable piece behind it.',
        initialFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 5',
        playerColor: 'w',
        instruction:
          'A pin immobilizes a piece because moving it would expose a higher-value target (like the Queen or King) along the same rank, file, or diagonal.',
        demoMoves: [],
        task: {
          instruction: 'Develop your Bishop to g5 to pin Black’s f6 Knight against the d8 Queen.',
          expectedMoves: ['Bg5'],
          solutionExplanation:
            'Excellent pin! Black’s f6 Knight cannot move without losing the Queen on d8.',
        },
      },
      {
        id: 'int-4',
        courseId: 'intermediate',
        conceptKey: 'tactical_skewer',
        title: 'The Skewer (X-Ray Attack)',
        description: 'Force a high-value piece to move and capture the target behind it.',
        initialFen: '4k3/8/8/8/3R4/8/4r3/3K4 w - - 0 1',
        playerColor: 'w',
        instruction:
          'A skewer is the reverse of a pin: you attack the more valuable piece first (often the King or Queen), forcing it to step aside and exposing the piece behind it.',
        demoMoves: [],
        task: {
          instruction: 'Play Re4+ to skewer the Black King on e8 and the Black Rook on e2!',
          expectedMoves: ['Re4+'],
          solutionExplanation:
            'Decisive skewer! Once the Black King steps out of check, Rxe2 wins a full Rook.',
        },
      },
      {
        id: 'int-5',
        courseId: 'intermediate',
        conceptKey: 'discovered_attack',
        title: 'Discovered Attacks & Pin Exploitation',
        description: 'Align long-range pieces along open lines to create tactical traps.',
        initialFen: 'r1bqkb1r/pppp1ppp/2n5/4P3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
        playerColor: 'w',
        instruction:
          'When an enemy piece stands on the same open file or diagonal as its uncastled King, aligning your Queen or Rook creates lethal discovered-attack and pin motifs.',
        demoMoves: [],
        task: {
          instruction: 'Play Qe2 to line up against Black’s e4 Knight and e8 King on the e-file.',
          expectedMoves: ['Qe2'],
          solutionExplanation:
            'Strong tactical alignment! Black’s Knight on e4 is now pinned to the e-file and under severe pressure.',
        },
      },
      {
        id: 'int-6',
        courseId: 'intermediate',
        conceptKey: 'basic_endgames',
        title: 'Basic Endgames: Cutting Off the King',
        description: 'Use your Rook to confine the enemy King and force checkmate.',
        initialFen: '8/8/8/4k3/8/8/R7/4K3 w - - 0 1',
        playerColor: 'w',
        instruction:
          'In King and Rook vs King endgames, use your Rook to erect an invisible barrier along a rank or file, restricting the enemy King to a shrinking box.',
        demoMoves: [],
        task: {
          instruction: 'Play Ra4 to cut the Black King off from crossing into the 4th rank.',
          expectedMoves: ['Ra4'],
          solutionExplanation:
            'Textbook technique! The Black King is now confined to the upper half of the board.',
        },
      },
      {
        id: 'int-7',
        courseId: 'intermediate',
        conceptKey: 'deflection_back_rank',
        title: 'Deflection, Removing the Defender & Back-Rank Weakness',
        description: 'Exploit an unventilated back rank by overloading or deflecting the sole defender.',
        initialFen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
        playerColor: 'w',
        instruction:
          'When a King is trapped behind its own wall of unmoved pawns (f7, g7, h7) with no escape square ("luft"), the 8th rank becomes a fatal weakness.',
        demoMoves: [],
        task: {
          instruction: 'Invade the 8th rank with Rxd8# to deliver a classic back-rank checkmate!',
          expectedMoves: ['Rxd8#'],
          solutionExplanation:
            'Back-rank checkmate! Always create breathing room (luft) for your King before trading into heavy-piece endgames.',
        },
      },
    ],
  },
  {
    id: 'advanced',
    levelNumber: 3,
    title: 'Level 3 — Advanced: Positional Mastery & Sacrifices',
    description:
      'Opening preparation, positional evaluation, prophylaxis, weak squares, outposts, pawn breaks, sacrifices, initiative, space advantage, and complex endgames.',
    icon: '🏆',
    levelElo: '1500 - 1900 Elo',
    lessons: [
      {
        id: 'adv-1',
        courseId: 'advanced',
        conceptKey: 'outposts_weak_squares',
        title: 'Positional Outposts & Weak Squares',
        description: 'Anchor Knights on central outpost squares that enemy pawns can never attack.',
        initialFen: 'r1b2rk1/pp1n1ppp/2p1pn2/q2p2B1/2PP4/2NBPN2/PP3PPP/R2QK2R w KQ - 0 8',
        playerColor: 'w',
        instruction:
          'An outpost is a square on the 5th or 6th rank protected by your own pawn and immune to enemy pawn attacks. A Knight stationed on a central outpost dominates both flanks.',
        demoMoves: [],
        task: {
          instruction: 'Plant your Knight on the powerful central outpost e5!',
          expectedMoves: ['Ne5'],
          solutionExplanation:
            'Positional mastery! From e5, your Knight radiates pressure across c6, d7, and f7.',
        },
      },
      {
        id: 'adv-2',
        courseId: 'advanced',
        conceptKey: 'lucena_endgame',
        title: 'Rook Endgames: The Lucena Bridge',
        description: 'Master the most important winning technique in all of endgame theory.',
        initialFen: '3K4/3P1k2/8/8/8/8/8/r3R3 w - - 0 1',
        playerColor: 'w',
        instruction:
          'In the Lucena position, your King stands in front of its 7th-rank pawn. By placing your Rook on the 4th rank, you prepare a "bridge" to block enemy Rook checks when your King steps out.',
        demoMoves: [],
        task: {
          instruction: 'Play Re4 to prepare the 4th-rank bridge for your King.',
          expectedMoves: ['Re4'],
          solutionExplanation:
            'Masterful! Now when your King marches out to c7 and c6, Re4–d4 will interpose on the 4th rank to stop all checks.',
        },
      },
      {
        id: 'adv-3',
        courseId: 'advanced',
        conceptKey: 'positional_sacrifice',
        title: 'The Greek Gift Sacrifice (Bxh7+) & Initiative',
        description: 'Calculate a classic Bishop sacrifice to rip open the castled enemy King.',
        initialFen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2NBPN2/PP3PPP/R1BQK2R w KQ - 0 7',
        playerColor: 'w',
        instruction:
          'When your Bishop eyes h7, your Knight can leap to g5 with tempo, and your Queen can join on h5, sacrificing on h7 shatters the enemy King’s fortress and seizes a decisive initiative.',
        demoMoves: [],
        task: {
          instruction: 'Execute the Greek Gift sacrifice with Bxh7+!',
          expectedMoves: ['Bxh7+'],
          solutionExplanation:
            'Brilliant sacrifice! After Kxh7, Ng5+ and Qh5 launch an unstoppable kingside mating attack.',
        },
      },
      {
        id: 'adv-4',
        courseId: 'advanced',
        conceptKey: 'pawn_breaks_prophylaxis',
        title: 'Central Pawn Breaks & Space Advantage',
        description: 'Open lines for your well-placed pieces when holding a development lead.',
        initialFen: 'r1bqk2r/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6',
        playerColor: 'w',
        instruction:
          'A timely central pawn break challenges the opponent’s pawn chain, opens diagonals and files for your Rooks and Bishops, and converts a development advantage into concrete initiative.',
        demoMoves: [],
        task: {
          instruction: 'Strike in the center with d3–d4 to challenge Black’s e5 stronghold!',
          expectedMoves: ['d4'],
          solutionExplanation:
            'Dynamic pawn break! 6.d4 opens the center and activates all of White’s minor pieces.',
        },
      },
    ],
  },
  {
    id: 'master',
    levelNumber: 4,
    title: 'Level 4 — Expert / Master: Deep Calculation & Imbalances',
    description:
      'Candidate move generation, forcing variations, strategic exchanges, dynamic imbalances, opposite-side castling, advanced pawn structures, and theoretical endgames.',
    icon: '👑',
    levelElo: '1900 - 2200+ Elo',
    lessons: [
      {
        id: 'mas-1',
        courseId: 'master',
        conceptKey: 'candidate_moves_forcing',
        title: 'Candidate Move Generation & Forcing Variations',
        description: 'Always calculate Checks, Captures, and Threats (CCT) in forcing order.',
        initialFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        playerColor: 'w',
        instruction:
          'Grandmasters structure calculation by identifying Candidate Moves first: 1) Checks, 2) Captures, 3) Forcing Threats, and 4) Quiet positional improvements (like preparing c3 and d4).',
        demoMoves: ['c3', 'Nf6', 'd4'],
        task: {
          instruction: 'Play c3 to prepare an unstoppable central pawn roller with d2–d4.',
          expectedMoves: ['c3', 'O-O', 'd3'],
          solutionExplanation:
            'Grandmaster preparation! 4.c3 builds an ideal central pawn duo on d4 and e4.',
        },
      },
      {
        id: 'mas-2',
        courseId: 'master',
        conceptKey: 'dynamic_imbalances',
        title: 'Dynamic Imbalances & Strategic Exchanges',
        description: 'Trade off the opponent’s most active defender to exploit dark-square weaknesses.',
        initialFen: 'r1bq1rk1/ppp1ppbp/2np1np1/8/2PPP3/2N1BP2/PP2B1PP/R2QK1NR w KQ - 3 7',
        playerColor: 'w',
        instruction:
          'In asymmetrical structures like the King’s Indian or Sicilian Dragon, advancing flank pawns or preparing Qd2 + Bh6 to exchange Black’s fianchettoed dark-squared Bishop weakens the enemy King permanently.',
        demoMoves: [],
        task: {
          instruction: 'Play Qd2 to form a Queen-Bishop battery aimed at trading off Black’s g7 Bishop via Bh6.',
          expectedMoves: ['Qd2'],
          solutionExplanation:
            'Strategic precision! The Queen-Bishop battery on c1–h6 prepares to eliminate Black’s key defensive Bishop.',
        },
      },
      {
        id: 'mas-3',
        courseId: 'master',
        conceptKey: 'theoretical_endgames',
        title: 'Theoretical Endgames: Distant Opposition',
        description: 'Outmaneuver the enemy King in pure pawn endgames using opposition.',
        initialFen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1',
        playerColor: 'w',
        instruction:
          'In King and Pawn endgames, the King must lead the pawn! Stepping your King in front of the pawn and seizing the opposition forces the defending King backward.',
        demoMoves: [],
        task: {
          instruction: 'Advance your King in front of your pawn (Kd4 or Kf4) to outflank Black’s King.',
          expectedMoves: ['Kd4', 'Kf4'],
          solutionExplanation:
            'Endgame mastery! Leading with the King ahead of the pawn is the key to converting King + Pawn endgames.',
        },
      },
      {
        id: 'mas-4',
        courseId: 'master',
        conceptKey: 'deep_calculation',
        title: 'Deep Calculation: The Opera House Combination',
        description: 'Calculate a multi-move Queen sacrifice leading to forced checkmate.',
        initialFen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 1 16',
        playerColor: 'w',
        instruction:
          'In Paul Morphy’s famous 1858 Opera Game, every White piece is mobilized while Black’s King is stuck on e8. Calculate the forcing Queen sacrifice that deflects the d7 Knight so the d1 Rook can deliver mate!',
        demoMoves: [],
        task: {
          instruction: 'Sacrifice your Queen on b8 (Qb8+!) to force Nxb8 followed by Rd8#.',
          expectedMoves: ['Qb8+'],
          solutionExplanation:
            'Immortal calculation! After 16.Qb8+! Nxb8, White plays 17.Rd8# as the g5 Bishop covers d8 and prevents Kxd8.',
        },
      },
    ],
  },
];
