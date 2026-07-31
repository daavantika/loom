# Phase 11 Plan — Technical Approach

## Backend
- `migrations/user-db/1700000000013-Messages.ts` — `messages` table: `cook_id`/`customer_id` FKs to `cook_profiles`/`customer_profiles` (`ON DELETE CASCADE`, matching `orders`' FK style), `sender_role` CHECK, `body`, `read_at`, `created_at`; indexes on `(cook_id, customer_id, created_at)` for thread reads and `(cook_id, read_at)` for the unread-count aggregate.
- `message.entity.ts` — mirrors `order.entity.ts`'s `ManyToOne` + raw-id-column style.
- `messages.service.ts` (`Message` repo + `CustomersService` + `CooksService`):
  - `listThread`/`sendMessage`/`markRead` are plain repository calls (`markRead` uses `IsNull()` in the criteria, not `undefined` — TypeORM's `.update()` silently drops `undefined` criteria keys instead of matching `IS NULL`, worth remembering for future update-with-null-check code).
  - `listConversationsForCook` uses `createQueryBuilder('m').innerJoin('m.customer', 'cp').innerJoin('cp.user', 'u')` (real TypeORM relation joins, not raw table-name joins) with quoted snake_case column references (`"cp"."display_name"`, `"m"."created_at"`, etc.) inside the aggregate expressions (`COALESCE`, `array_agg`, `COUNT(*) FILTER`) — TypeORM's alias-to-column translation is reliable for simple `alias.property` references in `.select()`/`.where()`/`.groupBy()`, but not guaranteed inside arbitrary raw SQL fragments, so those use real column names directly.
  - `assertCookIsMessageable` reuses `CooksService.getPublicProfile` (already merges verification status and already 404s if the cook doesn't exist) — no need for a separate `VerificationService` dependency.
- `messages.controller.ts` — both route groups behind `@Roles('COOK','CUSTOMER')`, ownership resolved via `resolveOwnCustomerId`/`resolveOwnCookId` (thin wrappers around `CustomersService.getOrCreateProfile`/`CooksService.getMyProfile`).
- `messages.module.ts` imports `CustomersModule` + `CooksModule`; registered in `app.module.ts`; `Message` entity also added to `src/user-db/data-source.ts`'s entity list (needed by the migration CLI — the runtime app picks it up automatically via `autoLoadEntities: true`).

## Frontend
- `data/api-types.ts`: `ApiMessage`, `ApiConversationSummary`.
- `store/appStore.ts`: customer-side (`chatThread`, `loadChatThread`, `sendChatMessage`) and cook-side (`cookConversations`, `loadCookConversations`, `cookThread`, `activeConversationCustomerId`, `loadCookThread`, `sendCookMessage`) state/actions — `loadCookThread` also re-triggers `loadCookConversations()` afterward so the unread badge updates immediately once a thread's been read. All reset in `logout()`.
- `modals/ChatModal.tsx` rewritten: real thread + 4s poll (first `setInterval` anywhere in this codebase — kept local to the component, no global polling manager), login-prompt early return when `!auth`.
- `views/Cook.tsx`: `CookTab` gains `'Messages'`; new `CookMessages` component (conversation list ↔ inline thread view, reusing `ChatCompose`); unread badge on the tab button (`.cook-bottom-nav button b`, CSS modeled on the existing `.cart-nav b` badge) fed by `cookConversations` loaded once at dashboard-mount time (in addition to `CookMessages`'s own on-tab-mount load) so the badge is visible without having to visit the tab first.

## Verification
1. `cd backend && npm run build && npm test` — `messages.service.spec.ts` (9 tests): thread ordering, mark-read targets the right sender role, unread-count/sort math on the raw conversation rows, verified-kitchen gate.
2. `npm run migration:run:user` against the local PGlite instance, then Neon.
3. `npm run test:e2e` — `messages.e2e-spec.ts` (6 tests): full send→see→read→reply→see loop through real HTTP, cross-cook and cross-customer isolation, 400 on an unverified kitchen. (Note: this session's e2e suite occasionally shows a transient "socket hang up" under back-to-back full-suite runs — a known PGlite connection-churn flake unrelated to any single spec's logic, confirmed by re-running; each spec file passes 100% both in isolation and in a clean full-suite run.)
4. `cd frontend && npx tsc -b && npm run build && npm test` — `chat-flow.test.tsx` (3 tests): logged-out prompt, a customer's real send-and-see-it round trip, the cook's Messages tab listing/unread-badge/reply round trip.
5. Manual pass with the running dev servers: message a real verified kitchen as a customer, see it land on the cook's Messages tab with an unread badge, reply, confirm the customer sees the reply within the poll interval.
