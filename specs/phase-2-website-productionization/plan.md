# Phase 2 Plan — Technical Approach

## Hosting
**Cloudflare Pages** (free tier, generous, fast global CDN, trivial custom-domain HTTPS via Cloudflare DNS). Alternative equally valid: Netlify. Either works fine for a zero-build static site — pick Cloudflare Pages unless the user already has a Netlify/Vercel account, then use that instead to avoid a new vendor.
- No build command needed (static `index.html`/`app.js`/`styles.css`, no bundler today) — deploy the repo root directly.
- Connect the custom domain via Cloudflare DNS (or the registrar's CNAME/A record to the host), confirm HTTPS auto-provisions (Let's Encrypt via the host — automatic on both Cloudflare Pages and Netlify).

## Metadata & assets
- Add to `index.html` `<head>`: meta description, `og:*` tags, `favicon.ico`/`favicon.svg` link tags, canonical URL.
- Generate favicon set from the existing brand mark (or a simple "L" wordmark if no logo asset exists yet) using a favicon generator; commit outputs under `/assets/icons`.
- Add `robots.txt` (allow all) and `sitemap.xml` (single root URL) at repo root — served automatically as static files by the host.
- Add `onerror="this.src='/assets/placeholder.png'"` (or equivalent JS-level fallback in the image-rendering helper in `app.js`) wherever `foodImages` values are used as `<img src>`.

## Error/empty states & a11y
- Grep `app.js` render functions (cart, search results, order history, reviews list, seller store) for the "if array is empty, render nothing" pattern and add a designed empty-state block matching the existing visual style in `styles.css`.
- Add `aria-label`s to modal close buttons, filter chips, and star controls following the existing convention already used on `location-button`/`profile-button`/nav items.
- Run a contrast checker (e.g., Chrome DevTools' built-in contrast ratio in the color picker) against `styles.css` color pairs, fix any failing pairs.

## Verification steps
1. `npx serve .` locally, click through every nav tab + modal, confirm zero console errors.
2. Deploy to the chosen host's preview URL, re-run the same click-through.
3. Run Lighthouse (Chrome DevTools, mobile profile, incognito) against the live preview URL; fix anything below the Phase 2 spec thresholds.
4. Tab through the entire UI with mouse disabled; confirm every control is reachable and operable.
5. Point the custom domain at the deploy, confirm HTTPS is valid (no browser warning) and `robots.txt`/`sitemap.xml` resolve.
6. Validate `og:image`/`og:title` in a social debugger tool using the live domain.
