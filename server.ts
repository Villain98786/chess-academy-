import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, GenerateContentResponse } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI with required user-agent header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Fast in-memory response cache to make repeated position/move lookups instant
const tutorCache = new Map<string, string>();
const MAX_CACHE_SIZE = 200;

function setCache(key: string, value: string) {
  if (tutorCache.size >= MAX_CACHE_SIZE) {
    const firstKey = tutorCache.keys().next().value;
    if (firstKey) tutorCache.delete(firstKey);
  }
  tutorCache.set(key, value);
}

function buildTutorPrompts(body: Record<string, unknown>): {
  systemInstruction: string;
  prompt: string;
  cacheKey: string;
} {
  const {
    action,
    fen,
    moveHistory,
    userMove,
    evalScore,
    userLevel = 'intermediate',
    question,
    puzzleContext,
    classification,
    bestAlternative,
  } = body as {
    action?: string;
    fen?: string;
    moveHistory?: string[];
    userMove?: string;
    evalScore?: string;
    userLevel?: string;
    question?: string;
    puzzleContext?: string;
    classification?: string;
    bestAlternative?: string;
  };

  const isLiveCommentary = action === 'live_commentary';

  const systemInstruction = `You are Grandmaster Elena, a fast, razor-sharp, encouraging AI Chess Coach at AI Chess Academy.
Student level: "${userLevel}".
Rules:
1. Be ultra-concise and direct. ${isLiveCommentary ? 'Keep your response to 2-3 punchy sentences (max 55 words).' : 'Keep your response under 110 words using 2-3 short bullet points.'}
2. Focus on actionable tactical & positional truth (king safety, center control, undefended pieces, pins, forks, tempo).
3. For hints, never reveal the exact SAN move notation—guide attention to the key square or piece.
4. Ground all advice strictly in the provided FEN and move history.`;

  let prompt = '';
  switch (action) {
    case 'live_commentary':
      prompt = `Real-Time Gameplay Move Analysis:
Player just played: "${userMove}" (Engine classification: ${classification || 'Good'}, Eval: ${evalScore || '0.0'}).
${bestAlternative && bestAlternative !== userMove ? `Engine's top choice was: "${bestAlternative}".` : 'This matched the engine top move!'}
Position FEN after move: "${fen}"
Recent moves: ${JSON.stringify(moveHistory?.slice(-6) || [])}

In 2-3 short sentences, tell the player why "${userMove}" is ${classification || 'notable'}, what threat or positional change it creates, and what to watch out for next.`;
      break;

    case 'explain_position':
      prompt = `Evaluate this chess position concisely:
FEN: "${fen}"
Recent moves: ${JSON.stringify(moveHistory?.slice(-8) || [])}
Engine Eval: ${evalScore ?? 'even'}

1. Who stands better and why (1 sentence).
2. Best strategic plan & 1-2 candidate ideas for the side to move.`;
      break;

    case 'explain_move':
      prompt = `The student played "${userMove}" (${classification || 'move'}).
Current FEN: "${fen}"
Engine Eval: ${evalScore ?? 'neutral'}
${bestAlternative ? `Best engine alternative: ${bestAlternative}` : ''}
Recent moves: ${JSON.stringify(moveHistory?.slice(-6) || [])}

Explain briefly:
1. Why "${userMove}" works or what weakness it leaves behind.
2. One concrete tactical or positional tip for the next turn.`;
      break;

    case 'hint':
      prompt = `Student needs a coaching hint without spoiling the exact move.
FEN: "${fen}"
${puzzleContext ? `Context: ${puzzleContext}` : ''}
Engine Eval: ${evalScore ?? 'equal'}

Give a 2-sentence hint:
- Clue: Point out the vulnerable square, alignment, or tactical motif.
- Piece to activate: Mention which piece type to look at without writing the target square.`;
      break;

    case 'ask_question':
      prompt = `Student question: "${question}"
Current board FEN: "${fen || 'starting position'}"
Recent moves: ${JSON.stringify(moveHistory?.slice(-6) || [])}

Answer clearly and concisely in 2-4 sentences.`;
      break;

    case 'opening_guidance':
      prompt = `Opening Explorer guidance:
FEN: "${fen}"
Moves played: ${JSON.stringify(moveHistory || [])}

Briefly explain:
1. Core strategic idea of this setup.
2. Main pawn breaks or traps both sides must know.`;
      break;

    default:
      prompt = `Give brief grandmaster advice for FEN: "${fen}".`;
  }

  const cacheKey = `${action || 'default'}:${fen || ''}:${userMove || ''}:${question || ''}:${userLevel}`;
  return { systemInstruction, prompt, cacheKey };
}

// Fast JSON AI Chess Tutor Endpoint (with ThinkingLevel.LOW for ~1s response)
app.post('/api/tutor', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API is not configured. Please ensure GEMINI_API_KEY is available.',
      });
      return;
    }

    const { systemInstruction, prompt, cacheKey } = buildTutorPrompts(req.body || {});

    const cached = tutorCache.get(cacheKey);
    if (cached) {
      res.json({ reply: cached, cached: true });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const reply = response.text || 'Focus on piece coordination, center control, and king safety!';
    setCache(cacheKey, reply);
    res.json({ reply });
  } catch (err: unknown) {
    console.error('Tutor error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown AI error';
    res.status(500).json({ error: errorMessage });
  }
});

// Streaming SSE AI Chess Tutor Endpoint for instant first-token display
app.post('/api/tutor/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API is not configured.',
      });
      return;
    }

    const { systemInstruction, prompt, cacheKey } = buildTutorPrompts(req.body || {});

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const cached = tutorCache.get(cacheKey);
    if (cached) {
      res.write(`data: ${JSON.stringify({ text: cached, done: true })}\n\n`);
      res.end();
      return;
    }

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const c = chunk as GenerateContentResponse;
      const part = c.text || '';
      if (part) {
        fullText += part;
        res.write(`data: ${JSON.stringify({ text: part, done: false })}\n\n`);
      }
    }

    if (fullText) {
      setCache(cacheKey, fullText);
    }
    res.write(`data: ${JSON.stringify({ text: '', done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    console.error('Tutor stream error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Stream failed';
    res.write(`data: ${JSON.stringify({ error: errorMessage, done: true })}\n\n`);
    res.end();
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
