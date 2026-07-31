# Phase 11 Spec — Real Cook ↔ Customer Chat

## Goal
Replace the fake chat feature (`ChatModal` — three hardcoded bubbles, local-only state thrown away on close, no backend, no way for the cook to ever see it) with a real one: a customer can message a kitchen from its profile or an order, and the cook can see and reply to it from a new real Messages tab on their dashboard.

## New backend capability: `src/messages/`

A conversation is every `messages` row sharing a `(cook_id, customer_id)` pair — a general inbox thread with a kitchen, not scoped to any one order (matches how the chat entry points already open generically, before any order necessarily exists).

### Customer-facing
| | |
|---|---|
| `GET /cooks/:cookId/messages` | The caller's own thread with that kitchen. 400s if the kitchen isn't verified/customer-facing. Marks the cook's messages read as a side effect. |
| `POST /cooks/:cookId/messages` | Sends a message as the customer. Same verified-kitchen check. |

### Cook-facing
| | |
|---|---|
| `GET /cooks/me/conversations` | Every customer who has messaged this kitchen — name, last message, unread count. |
| `GET /cooks/me/conversations/:customerId/messages` | The thread with one specific customer. Marks the customer's messages read as a side effect. |
| `POST /cooks/me/conversations/:customerId/messages` | Replies as the cook. |

All five routes accept both `COOK` and `CUSTOMER` JWT roles (a verified cook's account still carries `role: CUSTOMER` — see `CooksController`) — real scoping is "your own customer/cook profile," resolved per request.

## Frontend surfaces
- **`ChatModal`** (opened from an order or a kitchen profile): real thread, polled every 4s while open, real send. Shows a login prompt instead of a conversation when the customer isn't logged in.
- **Cook dashboard "Messages" tab** (new — the dashboard previously had no messaging surface at all): conversation list with an unread badge per conversation and a summed unread badge on the tab itself; tapping a conversation opens an inline thread (same polling, real reply).

## Business rules
- You can only message a kitchen that's actually verified/customer-facing — same rule `OrdersService.create` already applies before letting a customer order from a cook.
- Opening a thread marks the other party's unread messages read — no separate "mark read" action.
- Cross-isolation: a cook only ever sees their own conversations; a customer only ever sees their own thread with a given kitchen — enforced the same ownership-scoped way as every other cook/customer endpoint in this app.

## Acceptance criteria ("done")
1. A logged-out customer opening chat sees a login prompt, not a fake conversation.
2. A logged-in customer messages a verified kitchen from its profile; the message is real (survives a page reload/re-fetch).
3. The cook sees it on a real Messages tab with an unread badge, opens it (badge clears), and replies.
4. The customer sees the reply (via the 4s poll or reopening the modal).
5. A second, unrelated cook never sees the first cook's conversations; a second customer never sees another customer's thread with the same cook.
6. Messaging an unverified kitchen 400s.
