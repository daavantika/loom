import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type GeminiRole = 'user' | 'model';

export interface GeminiMessage {
  role: GeminiRole;
  text: string;
}

// 'gemini-2.5-flash'/'gemini-2.0-flash' are listed by ListModels but this
// key's project has zero generateContent quota for them (free-tier limit:
// 0) — 'gemini-flash-latest' is the one model confirmed working against the
// real key. Revisit if the account's billing/quota changes.
const MODEL = 'gemini-flash-latest';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Thin wrapper around Gemini's REST API (a single JSON POST — no SDK needed,
 * matches this codebase's preference for Node's built-ins over a new
 * dependency when the call is this simple, e.g. CryptoService's use of the
 * built-in `crypto` module). The API key never leaves this service — the
 * frontend only ever talks to our own /assistant/chat endpoint.
 */
@Injectable()
export class GeminiClientService {
  private readonly apiKey?: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY') || undefined;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async generateReply(systemPrompt: string, messages: GeminiMessage[]): Promise<string> {
    if (!this.apiKey) throw new Error('GeminiClientService: not configured (missing GEMINI_API_KEY)');

    const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`Gemini API error (${res.status}): ${data?.error?.message ?? res.statusText}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error('Gemini API returned an unexpected response shape');
    }
    return text;
  }
}
