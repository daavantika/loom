# Phase 17 Spec — Cook-Authored Specials/Stories + Dish Nutrition

## Goal
Two customer-facing surfaces existed with no real way for a cook to populate them: "Today's specials" (`Home.tsx`, `TodaySpecialsModal.tsx`) read `Dish.isTodaysSpecial`/`specialPortionsLeft`, fields the frontend `Dish` type had but the backend `MenuItem` never stored, and "Stories from the stove" (`StoriesModal.tsx`) was a permanent empty state with no backend at all. Dishes also carried no nutrition data. This phase gives cooks real authoring for all three from the cook dashboard, and shows the result to customers.

## New backend capability

### `menu_items` enrichment
Cooks can mark any menu item as today's special (with an optional portions-left count) and fill in nutrition — calories, protein, fat, carbs, fibre (all optional numbers) — plus qualitative highlight tags (e.g. "High protein", "High fibre") using the existing `tags` field. All new `menu_items` columns are nullable/defaulted — no backfill needed.

`POST /cooks/me/menu` and `PATCH /cooks/me/menu/:id` accept the new optional fields; `GET /cooks/:id/menu` (public) and `GET /cooks/me/menu` return them.

### `src/stories/` (new module)
A cook can post a short story (title, body, optional photo) about their kitchen, manage their own posts, and delete them. Customers see a public feed of stories from **verified kitchens only**.

| | |
|---|---|
| `GET /cooks/me/stories` | The caller's own stories, newest first. |
| `POST /cooks/me/stories` | Create a story. |
| `DELETE /cooks/me/stories/:id` | Delete one of the caller's own stories. |
| `GET /stories` | Public feed (latest 30, newest first) — only from verified cooks, enriched with `kitchenName`/`cookImage`. |

The `me` routes accept both `COOK` and `CUSTOMER` JWT roles, same role-claim caveat as `CooksController`/`MessagesController` — real scoping is the userId-resolved own cook profile.

## Frontend surfaces
- **Cook dashboard → Menu tab**: the "Add food item" form gains a "Mark as today's special" checkbox (+ portions-left input), five optional nutrition number fields, and a checklist of nutrition highlight tags. Existing menu rows gain an **Edit** button (previously only Pause/Remove existed — there was no way to change a dish after creating it).
- **Cook dashboard → More tab**: new "Share a story" row opens `CookStoriesModal` — an inline create form plus a list of the cook's own stories with delete.
- **Customer-facing `StoriesModal`**: now fetches and renders the real public feed instead of a permanent empty state.
- **`CookProfileModal`**: each dish row shows its highlight tags and any nutrition numbers that were filled in (e.g. "320 kcal · 18g protein").
- **`TodaySpecialsModal`/`Home.tsx`/`lib/specials.ts`**: unchanged — they already read `isTodaysSpecial`/`specialPortionsLeft` off `Dish`; this phase is what finally makes that data real.

## Acceptance criteria ("done")
1. A cook adds a dish, marks it as today's special with a portions count, and it appears in the customer-facing "Today's specials" (Home chip + modal).
2. A cook fills in calories/protein/etc. and/or highlight tags on a dish; a customer opening that kitchen's profile sees them on the dish row.
3. A cook edits an existing dish (not just at creation) to change price, special status, or nutrition.
4. A cook posts a story with a photo; it appears in the customer-facing Stories modal with their kitchen name attached.
5. A story from an unverified/unlisted cook never appears in the public feed.
6. A cook can delete their own story; it disappears from both their own list and the public feed.
