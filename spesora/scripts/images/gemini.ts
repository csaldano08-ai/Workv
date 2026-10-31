import { LIMITS } from './config';

/**
 * Client minimo per l'API ufficiale Google Gemini (REST, chiave API in header).
 * Nessun cookie di sessione, nessuna API non ufficiale.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class QuotaExhaustedError extends Error {}
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call<T>(apiKey: string, path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= LIMITS.retryDelaysMs.length; attempt++) {
    try {
      const res = await fetch(`${BASE}/${path}`, {
        method: init.method,
        headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
      if (res.ok) return (await res.json()) as T;
      const text = await res.text();
      // Quota giornaliera/crediti esauriti: non insistere, salvare lo stato e fermarsi.
      if (res.status === 429 && /quota|exhausted|billing/i.test(text) && attempt >= 1) {
        throw new QuotaExhaustedError(`Quota esaurita: ${text.slice(0, 300)}`);
      }
      if ([429, 500, 502, 503, 504].includes(res.status) && attempt < LIMITS.retryDelaysMs.length) {
        lastError = new ApiError(text.slice(0, 300), res.status);
        await sleep(LIMITS.retryDelaysMs[attempt]);
        continue;
      }
      throw new ApiError(`HTTP ${res.status}: ${text.slice(0, 500)}`, res.status);
    } catch (e) {
      if (e instanceof QuotaExhaustedError || e instanceof ApiError) throw e;
      lastError = e; // errore di rete temporaneo
      if (attempt < LIMITS.retryDelaysMs.length) await sleep(LIMITS.retryDelaysMs[attempt]);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export interface ModelInfo {
  name: string;
  displayName?: string;
  supportedGenerationMethods?: string[];
}

export async function listModels(apiKey: string): Promise<ModelInfo[]> {
  const out: ModelInfo[] = [];
  let pageToken = '';
  do {
    const res = await call<{ models?: ModelInfo[]; nextPageToken?: string }>(apiKey, `models?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`, { method: 'GET' });
    out.push(...(res.models ?? []));
    pageToken = res.nextPageToken ?? '';
  } while (pageToken);
  return out;
}

/** Sceglie il modello richiesto se esiste, altrimenti un modello immagine disponibile per la chiave. */
export function resolveModel(models: ModelInfo[], wanted: string, kind: 'image' | 'check'): string {
  const names = models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace(/^models\//, ''));
  if (names.includes(wanted)) return wanted;
  const candidates = kind === 'image' ? names.filter((n) => /image/.test(n) && !/preview-tts|embedding/.test(n)) : names.filter((n) => /^gemini-[\d.]+-flash$/.test(n));
  if (candidates.length === 0) throw new Error(`Nessun modello ${kind} disponibile per questa chiave. Modelli: ${names.join(', ')}`);
  return candidates.sort().reverse()[0];
}

interface Part {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}
interface GenerateResponse {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export async function generateImage(apiKey: string, model: string, prompt: string, reference?: { mimeType: string; data: Buffer }): Promise<{ data: Buffer; mimeType: string }> {
  const parts: Part[] = [{ text: prompt }];
  if (reference) parts.push({ inlineData: { mimeType: reference.mimeType, data: reference.data.toString('base64') } });
  const res = await call<GenerateResponse>(apiKey, `models/${model}:generateContent`, {
    method: 'POST',
    body: {
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:3' } },
    },
  });
  if (res.promptFeedback?.blockReason) throw new ApiError(`Prompt bloccato: ${res.promptFeedback.blockReason}`, 400);
  const img = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!img?.inlineData) throw new ApiError(`Nessuna immagine nella risposta (finishReason: ${res.candidates?.[0]?.finishReason ?? 'n/d'})`, 422);
  return { data: Buffer.from(img.inlineData.data, 'base64'), mimeType: img.inlineData.mimeType };
}

export interface SemanticCheck {
  matches: boolean;
  confidence: number;
  hasText: boolean;
  issues: string[];
}

/** Controllo di coerenza: un modello con visione confronta l'immagine con nome e ingredienti reali. */
export async function checkImage(apiKey: string, model: string, image: Buffer, recipeName: string, ingredients: string[]): Promise<SemanticCheck> {
  const question = [
    `This illustration should depict the Italian dish "${recipeName}" containing: ${ingredients.join(', ')}.`,
    'Answer strictly as JSON with keys: matches (boolean: is it plausibly this dish with these main ingredients?),',
    'confidence (0..1), hasText (boolean: any visible letters, numbers, logos or watermark?), issues (array of short strings).',
  ].join(' ');
  const res = await call<GenerateResponse>(apiKey, `models/${model}:generateContent`, {
    method: 'POST',
    body: {
      contents: [{ role: 'user', parts: [{ text: question }, { inlineData: { mimeType: 'image/jpeg', data: image.toString('base64') } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    },
  });
  const text = res.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text ?? '{}';
  try {
    const j = JSON.parse(text) as Partial<SemanticCheck>;
    return { matches: !!j.matches, confidence: Number(j.confidence ?? 0), hasText: !!j.hasText, issues: Array.isArray(j.issues) ? j.issues.map(String) : [] };
  } catch {
    return { matches: false, confidence: 0, hasText: false, issues: ['Risposta del controllo non interpretabile'] };
  }
}
