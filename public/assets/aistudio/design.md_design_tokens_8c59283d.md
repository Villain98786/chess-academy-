# Grandmaster Studio — Design System & Tokens Documentation (DESIGN.md)

This document formalizes the complete design language, design tokens, color palette, typography, elevation, spacing scale, component patterns, and responsive layout specifications for **Grandmaster Studio** (AI Chess Academy).

---

## 1. Design Philosophy & Aesthetic Direction
- **Theme**: Dark Modernist Grandmaster Arena
- **Brand Archetype**: Analytical, Prestigious, Tactical, Precision-Engineered
- **Atmosphere**: Deep tournament charcoals and obsidian slate layered surfaces, illuminated by luminous neural emeralds (`#10b981`), tournament gold accents, and FIDE-standard engine annotation indicators.
- **Visual Rhythm**: High information density without visual noise. Generous interior card padding, subtle 1px border outlines with alpha transparency, and strict geometric proportionality for chessboard viewports.

---

## 2. Color System & Semantic Tokens

### 2.1 Surface & Neutral Foundations
| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `--surface-canvas` | `#070a12` | App background, global outer canvas |
| `--surface-container-lowest` | `#0a0e18` | Deepest surface, navigation sidebar background |
| `--surface-container-low` | `#111624` | Sidebar active states, sunken wells |
| `--surface-container` | `#171c2b` | Primary card background, board tray background |
| `--surface-container-high` | `#1f2638` | Secondary cards, hovered table rows, modals |
| `--surface-container-highest` | `#283147` | Pill tags, active tab headers, elevated chips |
| `--border-subtle` | `rgba(255, 255, 255, 0.06)` | Standard structural dividers and card borders |
| `--border-default` | `rgba(255, 255, 255, 0.12)` | Interactive element borders, input fields |
| `--border-focus` | `rgba(16, 185, 129, 0.50)` | Active focus rings, highlighted move squares |

### 2.2 Text & Content Hierarchy
| Token | Hex / Value | Contrast / Usage |
| :--- | :--- | :--- |
| `--text-primary` | `#f1f5f9` | Primary headings, player names, clock readouts |
| `--text-secondary` | `#94a3b8` | Subheaders, meta descriptions, secondary metrics |
| `--text-tertiary` | `#64748b` | Coordinate letters/numbers, helper tooltips |
| `--text-disabled` | `#475569` | Locked milestones, inactive options |

### 2.3 Brand & Primary Accents
| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `--primary` | `#10b981` | Emerald accent, primary CTAs, active status, Stockfish bar |
| `--primary-hover` | `#059669` | Hovered primary buttons |
| `--primary-subtle` | `rgba(16, 185, 129, 0.12)`| Accent badges, active pill backgrounds, board highlights |
| `--primary-glow` | `rgba(16, 185, 129, 0.25)`| Radial glow on active bot status and winning markers |

### 2.4 Engine & Chess Move Annotations
| Annotation Tag | Symbol | Hex Code | Purpose |
| :--- | :---: | :---: | :--- |
| **Brilliant** | `!!` | `#06b6d4` | Cyan / Turquoise — Rare tactical genius or sacrifice |
| **Great** | `!` | `#10b981` | Emerald Green — Critical maintaining move |
| **Best Move** | `★` | `#22c55e` | Lime Green — Optimal Stockfish 16 NNUE line |
| **Excellent** | `✓` | `#14b8a6` | Teal — Strong theoretical continuation |
| **Good** | `✓` | `#64748b` | Muted Slate — Neutral sound move |
| **Book Move** | `📖` | `#a855f7` | Purple — Recognized opening repertoire branch |
| **Inaccuracy** | `?!` | `#f59e0b` | Amber — Slight positional concession (`-0.3` to `-0.8`) |
| **Mistake** | `?` | `#f97316` | Orange — Clear tactical error (`-0.9` to `-2.0`) |
| **Blunder** | `??` | `#ef4444` | Red — Decisive blunder / lost material |
| **Missed Win** | `✕` | `#f43f5e` | Rose Ruby — Overlooked forced mate or winning conversion |

### 2.5 Chessboard Theme Tokens
| Token | Value | Description |
| :--- | :--- | :--- |
| `--board-square-light` | `#2d3548` | Dark slate tournament vinyl light square |
| `--board-square-dark` | `#1a202e` | Deep obsidian tournament dark square |
| `--board-square-highlight-from`| `rgba(16, 185, 129, 0.28)` | Translucent emerald highlight on origin square |
| `--board-square-highlight-to` | `rgba(16, 185, 129, 0.45)` | High-contrast emerald highlight on target square |
| `--board-square-check` | `rgba(239, 68, 68, 0.55)` | Red radial gradient on checked king square |
| `--board-vector-arrow` | `#06b6d4` | Cyan vector attack indicator with directional head |

---

## 3. Typography Hierarchy

### 3.1 Typefaces
- **Primary UI & Headings**: `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
- **Notation, Clocks & Engine Stats**: `JetBrains Mono`, `Fira Code`, monospace

### 3.2 Type Scale
| Level | Font Size | Line Height | Weight | Letter Spacing | Font Family |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | `32px` (`2rem`) | `1.2` | 700 / Bold | `-0.03em` | Plus Jakarta Sans |
| **Heading 1** | `24px` (`1.5rem`) | `1.25` | 700 / Bold | `-0.02em` | Plus Jakarta Sans |
| **Heading 2** | `20px` (`1.25rem`)| `1.3` | 600 / Semi | `-0.01em` | Plus Jakarta Sans |
| **Heading 3 / Subtitle**| `16px` (`1rem`) | `1.4` | 600 / Semi | `0em` | Plus Jakarta Sans |
| **Body Default** | `14px` (`0.875rem`)| `1.5` | 400 / Reg | `0em` | Plus Jakarta Sans |
| **Body Small** | `12px` (`0.75rem`) | `1.5` | 400 / 500 | `+0.01em` | Plus Jakarta Sans |
| **Caption / Micro** | `11px` (`0.6875rem`)| `1.4` | 500 / Med | `+0.03em` | Plus Jakarta Sans |
| **Clock Digital Large** | `36px` (`2.25rem`)| `1.0` | 700 / Bold | `-0.02em` | JetBrains Mono |
| **Clock Digital Normal**| `22px` (`1.375rem`)| `1.0` | 700 / Bold | `-0.01em` | JetBrains Mono |
| **Algebraic Notation** | `13px` (`0.8125rem`)| `1.4` | 500 / Med | `0em` | JetBrains Mono |

---

## 4. Spacing, Radii & Elevation

### 4.1 Spacing Scale
- `2xs`: `4px`
- `xs`: `8px`
- `sm`: `12px`
- `md`: `16px`
- `lg`: `24px`
- `xl`: `32px`
- `2xl`: `48px`

### 4.2 Border Radii
- `--radius-xs`: `4px` (notation tags, engine pills)
- `--radius-sm`: `6px` (buttons, dropdown options)
- `--radius-md`: `8px` (cards, chess board frame, move trays)
- `--radius-lg`: `12px` (feature modules, coach dialogue panels)
- `--radius-full`: `9999px` (status badges, player avatars, pill filters)

### 4.3 Elevation & Shadows
- `--shadow-subtle`: `0 1px 3px 0 rgba(0, 0, 0, 0.35)`
- `--shadow-card`: `0 4px 16px -2px rgba(0, 0, 0, 0.45)`
- `--shadow-board`: `0 12px 36px -4px rgba(0, 0, 0, 0.65)`
- `--shadow-glow-emerald`: `0 0 20px -4px rgba(16, 185, 129, 0.35)`

---

## 5. Core Component Tokens & Patterns

### 5.1 Interactive Tournament Board Container
```css
.chess-board-frame {
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: min(100vw - 32px, 680px);
  background: var(--surface-container);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-board);
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  user-select: none;
  touch-action: manipulation;
}
```

### 5.2 Stockfish 16.1 NNUE Evaluation Bar
```css
.eval-bar {
  width: 24px;
  height: 100%;
  border-radius: var(--radius-xs);
  background: #1e293b; /* Black advantage */
  position: relative;
  overflow: hidden;
}
.eval-bar-white {
  position: absolute;
  bottom: 0;
  width: 100%;
  background: #10b981; /* Luminous White advantage */
  transition: height 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 5.3 Digital Fischer Clock
```css
.chess-clock {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  background: var(--surface-container-low);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.chess-clock.active {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow-emerald);
  color: #ffffff;
}
```

### 5.4 AI Grandmaster Coach Speech Bubble
```css
.coach-bubble {
  background: var(--surface-container);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-md);
  padding: 16px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
}
```

---

## 6. Responsive Breakpoint Matrix

| Viewport | Range | Layout Architecture | Navigation Pattern | Board Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | `< 768px` | Single-column stacked vertical stream | Bottom navigation bar (`h-16 fixed bottom-0`) | `min(100vw - 32px, 480px)`, strict 1:1, touch controls |
| **Tablet** | `768px – 1023px` | 2-column adaptive grid | Collapsed icon-rail left navigation | Adaptive 480px–560px board, side inspector |
| **Desktop**| `≥ 1024px` | 3-column tournament stadium | Persistent 240px left sidebar + persistent header | Full 640px–720px tournament arena with evaluation gauge |

---

## 7. JSON Token Specification Export
```json
{
  "theme": "Grandmaster Studio Dark",
  "version": "1.0.0",
  "colors": {
    "background": "#070a12",
    "surface": {
      "lowest": "#0a0e18",
      "low": "#111624",
      "base": "#171c2b",
      "high": "#1f2638",
      "highest": "#283147"
    },
    "brand": {
      "primary": "#10b981",
      "primaryHover": "#059669",
      "primarySubtle": "rgba(16, 185, 129, 0.12)"
    },
    "text": {
      "primary": "#f1f5f9",
      "secondary": "#94a3b8",
      "tertiary": "#64748b"
    },
    "board": {
      "lightSquare": "#2d3548",
      "darkSquare": "#1a202e",
      "highlight": "rgba(16, 185, 129, 0.35)",
      "arrow": "#06b6d4"
    },
    "eval": {
      "brilliant": "#06b6d4",
      "great": "#10b981",
      "best": "#22c55e",
      "book": "#a855f7",
      "inaccuracy": "#f59e0b",
      "mistake": "#f97316",
      "blunder": "#ef4444"
    }
  },
  "typography": {
    "fonts": {
      "sans": "Plus Jakarta Sans, sans-serif",
      "mono": "JetBrains Mono, monospace"
    }
  },
  "radii": {
    "sm": "6px",
    "md": "8px",
    "lg": "12px",
    "full": "9999px"
  }
}
```
