# Phase 12 Spec — Real AI Assistant (Gemini-powered concierge)

## Goal
Replace the fake ✦ assistant (`AssistantModal` — three hardcoded bubbles, quick-action buttons that just navigated away with a toast, no real AI) with a real one, backed by Google Gemini, grounded in the real catalog so it only ever recommends kitchens/dishes that actually exist.

## New backend capability: `src/assistant/`

### `POST /assistant/chat`
| | |
|---|---|
| Auth | Public — same openness as the public catalog endpoints, since it only ever touches public catalog data |
| Body | `{ messages: [{ role: 'user'\|'assistant', text: string }] }` — the full running conversation, resent each turn (stateless backend, no persistence — this conversation doesn't need to survive a reload or be seen by anyone else, unlike Phase 11's cook↔customer chat) |
| Limits | Max 20 messages, max 1000 characters each — the one abuse guard included this pass; no dedicated rate limiting yet |
| Response | `{ reply: string }` |

Grounded: the system prompt sent to Gemini includes the current real verified-kitchen catalog (name, area, bio, a few real dishes with real prices each) with an explicit instruction to only recommend from that list and say so honestly when nothing fits — never invent a kitchen or dish. Degrades safely: with no `GEMINI_API_KEY` configured, or if the Gemini call itself fails, returns a static "not available right now" reply rather than erroring.

**Security**: the Gemini API key never leaves the backend — unlike Razorpay's public `key_id` (deliberately shipped to the frontend for Checkout.js), an LLM key is a full secret. The frontend only ever calls our own `/assistant/chat`.

## Frontend surfaces
- **`AssistantModal`**: real conversation, real replies, a loading indicator while waiting. The three quick-action buttons ("Set up tiffins", "Festival food", "Plan an event") now send a real, specific starter prompt through the same real pipeline instead of navigating away before the user reads a response.

## Business rules
- Only ever recommends real, currently-verified kitchens/dishes — never a hallucinated one.
- No account/auth required to use the assistant.
- Conversation state lives only in the browser tab (Zustand store) — resets on logout/reload, same as the rest of the app's ephemeral UI state.

## Acceptance criteria ("done")
1. Asking the assistant a food question gets a real Gemini-generated reply, not a scripted one.
2. The reply only ever names kitchens/dishes that are actually in the current verified catalog.
3. With the catalog empty, the assistant says so honestly rather than inventing a recommendation.
4. With no Gemini key configured, the assistant returns a friendly "not available" message instead of erroring.
5. A quick-action button sends a real prompt and the modal stays open to show the real reply.
6. The Gemini API key never appears in any frontend network request or bundle.
