// AI provider adapters: Ollama (cloud or self-hosted), Google Gemini, and any
// OpenAI-compatible chat API (OpenRouter, Groq, Together, LM Studio, vLLM, ...).
import 'server-only';

export type ProviderId = 'ollama-cloud' | 'ollama-self' | 'gemini' | 'openai-compatible';

export const PROVIDERS: Record<ProviderId, { label: string; defaultBaseUrl: string; defaultModel: string; keyRequired: boolean; envKey: string; note: string }> = {
  'ollama-cloud': { label: 'Ollama Cloud', defaultBaseUrl: 'https://ollama.com', defaultModel: 'gpt-oss:120b', keyRequired: true, envKey: 'OLLAMA_API_KEY', note: 'Free plan available. Create a key at ollama.com → Settings → Keys.' },
  'ollama-self': { label: 'Self-hosted Ollama', defaultBaseUrl: 'http://localhost:11434', defaultModel: 'gpt-oss:20b', keyRequired: false, envKey: 'OLLAMA_API_KEY', note: 'Your own Ollama server (e.g. in Ethiopia). Data stays on your server.' },
  gemini: { label: 'Google Gemini', defaultBaseUrl: 'https://generativelanguage.googleapis.com', defaultModel: 'gemini-2.5-flash', keyRequired: true, envKey: 'GEMINI_API_KEY', note: 'Free tier available. Create a key in Google AI Studio.' },
  'openai-compatible': { label: 'OpenAI-compatible (OpenRouter, Groq, …)', defaultBaseUrl: 'https://openrouter.ai/api/v1', defaultModel: '', keyRequired: true, envKey: 'OPENAI_COMPAT_API_KEY', note: 'Any service with a /chat/completions API. Several offer free models.' },
};

export type ProviderConfig = { provider: ProviderId; baseUrl: string; apiKey?: string; model: string; temperature: number; maxTokens: number; timeoutMs: number };

export class AIError extends Error {
  constructor(message: string, public status: number, public kind: 'rate_limit' | 'auth' | 'model' | 'timeout' | 'upstream' | 'config') { super(message); }
}

const trim = (u: string) => u.replace(/\/+$/, '');

async function call(url: string, init: RequestInit, timeoutMs: number, model: string) {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
  } catch (e) {
    if (e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new AIError('The AI service took too long to answer.', 504, 'timeout');
    throw new AIError('Could not reach the AI service. Check the server address and network access.', 502, 'upstream');
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 240);
    if (res.status === 429) throw new AIError('The AI usage limit is reached for now (free plan quota). Please try again later.', 429, 'rate_limit');
    if (res.status === 401 || res.status === 403) throw new AIError('The AI service rejected the API key.', 502, 'auth');
    if (res.status === 404) throw new AIError(`Model "${model}" or address not found. ${detail}`, 502, 'model');
    throw new AIError(`AI service error ${res.status}. ${detail}`, 502, 'upstream');
  }
  return res.json();
}

export type ChatResult = { content: string; model: string; inputTokens?: number; outputTokens?: number; ms: number };

export async function chat(cfg: ProviderConfig, system: string, user: string, maxTokens = cfg.maxTokens): Promise<ChatResult> {
  if (!cfg.model) throw new AIError('No model selected. Choose a model in AI settings.', 503, 'config');
  if (PROVIDERS[cfg.provider].keyRequired && !cfg.apiKey) throw new AIError('No API key configured for this provider.', 503, 'config');
  const t0 = Date.now(), base = trim(cfg.baseUrl);

  if (cfg.provider === 'ollama-cloud' || cfg.provider === 'ollama-self') {
    const j = await call(`${base}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify({ model: cfg.model, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], options: { temperature: cfg.temperature, num_predict: maxTokens } }),
    }, cfg.timeoutMs, cfg.model) as { message?: { content?: string }; model?: string; prompt_eval_count?: number; eval_count?: number };
    return done(j.message?.content, j.model || cfg.model, j.prompt_eval_count, j.eval_count, t0);
  }

  if (cfg.provider === 'gemini') {
    const model = cfg.model.replace(/^models\//, '');
    const j = await call(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.apiKey || '' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { temperature: cfg.temperature, maxOutputTokens: maxTokens } }),
    }, cfg.timeoutMs, model) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[]; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }; promptFeedback?: { blockReason?: string } };
    if (j.promptFeedback?.blockReason) throw new AIError(`Gemini blocked the request (${j.promptFeedback.blockReason}).`, 502, 'upstream');
    const c = j.candidates?.[0];
    const text = (c?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
    if (!text && c?.finishReason === 'MAX_TOKENS') throw new AIError('Gemini used all output tokens before answering. Increase "Max output tokens" in AI settings.', 502, 'upstream');
    return done(text, model, j.usageMetadata?.promptTokenCount, j.usageMetadata?.candidatesTokenCount, t0);
  }

  const j = await call(`${base}/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
    body: JSON.stringify({ model: cfg.model, temperature: cfg.temperature, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  }, cfg.timeoutMs, cfg.model) as { choices?: { message?: { content?: string } }[]; model?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } };
  return done(j.choices?.[0]?.message?.content, j.model || cfg.model, j.usage?.prompt_tokens, j.usage?.completion_tokens, t0);
}

function done(content: string | undefined, model: string, i: number | undefined, o: number | undefined, t0: number): ChatResult {
  const text = (content || '').trim();
  if (!text) throw new AIError('The AI service returned an empty answer.', 502, 'upstream');
  return { content: text, model, inputTokens: i, outputTokens: o, ms: Date.now() - t0 };
}

export async function listModels(cfg: ProviderConfig): Promise<string[]> {
  const base = trim(cfg.baseUrl);
  if (cfg.provider === 'ollama-cloud' || cfg.provider === 'ollama-self') {
    const j = await call(`${base}/api/tags`, { headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {} }, 15_000, cfg.model) as { models?: { name?: string; model?: string }[] };
    return (j.models || []).map(m => m.name || m.model || '').filter(Boolean);
  }
  if (cfg.provider === 'gemini') {
    const j = await call(`${base}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': cfg.apiKey || '' } }, 15_000, cfg.model) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (j.models || []).filter(m => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
  }
  const j = await call(`${base}/models`, { headers: cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {} }, 15_000, cfg.model) as { data?: { id: string }[] };
  return (j.data || []).map(m => m.id);
}
