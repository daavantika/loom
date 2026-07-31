# Phase 12 Plan — Technical Approach

## Backend
- `gemini-client.service.ts` — thin wrapper (same shape as `RazorpayClientService`): `isConfigured()`, `generateReply(systemPrompt, messages)`. Plain `fetch` POST to `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=<key>` — no new npm dependency, matches this codebase's preference for a raw `fetch`/Node built-in over a new SDK when the call is a single JSON POST (same reasoning as `CryptoService` using Node's built-in `crypto` directly). Reads `data.candidates[0].content.parts[0].text`; throws clearly on a non-OK response or an unexpected shape.
- `assistant.service.ts` — `chat(history)`: returns a static fallback immediately if not configured (no catalog fetch, no Gemini call); otherwise builds a system prompt from real catalog data (`CooksService.searchPublic({verifiedOnly:true})`, capped to 20 kitchens, each with up to 4 real dishes via `MenuService.listActiveForCook` — same accepted N+1-at-this-scale tradeoff as the frontend's `lib/catalog.ts`), maps the frontend's `'assistant'` role to Gemini's own `'model'` vocabulary, and catches any Gemini-call failure into the same static fallback (never lets a transient API error 500 the endpoint).
- `assistant.controller.ts` — `POST /assistant/chat`, no `JwtAuthGuard` (public, matches the public catalog endpoints). `ChatDto`/`ChatMessageDto` cap the request at 20 messages / 1000 chars each.
- `assistant.module.ts` imports `CooksModule` + `MenuModule` (already-exported services); registered in `app.module.ts`. No new entity, no migration.
- `GEMINI_API_KEY` added to `backend/.env` (the real, already-verified-live key) and `backend/.env.example` (blank placeholder) — deliberately absent from `.env.test` so the e2e suite's default behavior is "not configured" unless a test explicitly overrides the provider.

## Frontend
- `data/api-types.ts`: `ApiAssistantMessage`, `ApiAssistantChatResponse`.
- `store/appStore.ts`: `assistantMessages`, `assistantLoading`, `sendAssistantMessage(text)` — appends the user's message to the running history immediately, POSTs the *entire* history (the backend is stateless — it has no memory between calls), appends the real reply. Reset in `logout()` for consistency with the rest of the ephemeral state, even though the endpoint itself needs no auth.
- `modals/AssistantModal.tsx` rewritten: real messages array (no more hardcoded bubbles), a "Thinking…" bubble while `assistantLoading`, `ChatCompose`'s `onSend` wired to `sendAssistantMessage`. Quick-action buttons now call `send(realPromptText)` instead of `navigate(...) + closeModal()` — the point of asking is to read the answer, so the modal no longer closes itself on a quick action.

## Verification
1. `cd backend && npm run build && npm test` — `gemini-client.service.spec.ts` (6 tests: request/response shape, `isConfigured()`, error paths), `assistant.service.spec.ts` (4 tests: not-configured fallback, real grounding-data assembly + role mapping, empty-catalog honesty, Gemini-throws fallback).
2. No migration needed.
3. `npm run test:e2e` — `assistant.e2e-spec.ts` (5 tests), `GeminiClientService` mocked via `overrideProvider` at the Nest DI level (never calls the real paid API in automated tests, same policy as Razorpay in Phase 10): public reachability, grounding-prompt assembly from real seeded catalog data, and the three DTO validation limits (message count, message length, invalid role).
4. `cd frontend && npx tsc -b && npm run build && npm test` — `assistant-flow.test.tsx` (3 tests): a real send-and-render round trip, a second turn proving the *full* history (not just the latest message) is resent, and a quick-action button's real prompt reaching the backend.
5. **Manual, real-key verification** — with the dev backend running against the real `GEMINI_API_KEY`, a live `curl POST /assistant/chat` confirms an actual Gemini-generated, catalog-grounded reply (not mocked) comes back end to end.
