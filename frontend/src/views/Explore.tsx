import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import ClickableCard from '../components/ClickableCard';
import EmptyState from '../components/EmptyState';

const CATEGORIES = ['All', 'Tamil', 'Bakery', 'Tiffin', 'Catering', 'Jain'] as const;
type Category = (typeof CATEGORIES)[number];

// Chips act as text-search shortcuts (matched against name/cuisine/bio/dish
// names+tags) rather than a fake cuisine taxonomy — there's no real cuisine
// field on a cook yet, so this stays honest about what's actually known.
function categoryMatch(category: Category, k: { name: string; cuisine: string; bio: string; dishes: { name: string; tags: string[] }[] }) {
  if (category === 'All') return true;
  const haystack = `${k.name} ${k.cuisine} ${k.bio} ${k.dishes.map((d) => `${d.name} ${d.tags.join(' ')}`).join(' ')}`.toLowerCase();
  return haystack.includes(category.toLowerCase());
}

export default function Explore() {
  const kitchens = useKitchens();
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const exploreCategory = useAppStore((s) => s.exploreCategory) as Category;
  const setExploreCategory = useAppStore((s) => s.setExploreCategory);
  const activeFilters = useAppStore((s) => s.activeFilters);
  const openModal = useAppStore((s) => s.openModal);

  const term = search.trim().toLowerCase();
  const visible = kitchens.filter(
    (k) =>
      categoryMatch(exploreCategory, k) &&
      (!term || `${k.name} ${k.cook} ${k.cuisine} ${k.dishes.map((d) => d.name).join(' ')}`.toLowerCase().includes(term)),
  );

  return (
    <>
      <div className="screen-title">
        <h1>Explore kitchens</h1>
        <button onClick={() => openModal({ kind: 'filters' })}>Filter · {activeFilters.length}</button>
      </div>
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cooks, dishes, bakery, tiffin…" aria-label="Search kitchens" />
        <button className="filter-trigger" onClick={() => setSearch('')} aria-label="Clear search">
          ×
        </button>
      </div>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip${c === exploreCategory ? ' active' : ''}`} onClick={() => setExploreCategory(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="results-info">
        <span>{visible.length} trusted kitchens in your area</span>
        <span>⌖ within 5 km</span>
      </div>
      <section className="discover-map" aria-label="Map of nearby kitchens">
        <iframe
          title="Nearby kitchens in Coimbatore"
          src="https://www.openstreetmap.org/export/embed.html?bbox=76.9373%2C11.0015%2C76.9815%2C11.0329&layer=mapnik&marker=11.0168%2C76.9558"
          loading="lazy"
        ></iframe>
        <div className="map-topline">
          <span>⌖ Nearby kitchens</span>
          <span className="map-live">Live area</span>
        </div>
        <button className="map-pin pin-one" onClick={() => openModal({ kind: 'cook', cookId: 'meera' })} aria-label="Open Meera's Kitchen">
          ★
        </button>
        <button className="map-pin pin-two" onClick={() => openModal({ kind: 'cook', cookId: 'anitha' })} aria-label="Open Anitha Bakes">
          ★
        </button>
        <button className="map-pin pin-three" onClick={() => openModal({ kind: 'cook', cookId: 'shafi' })} aria-label="Open Shafi's Table">
          ★
        </button>
        <button className="map-address-button" onClick={() => openModal({ kind: 'location' })}>
          Set exact address
        </button>
      </section>
      <section className="kitchen-list">
        {visible.length ? (
          visible.map((k) => (
            <ClickableCard key={k.id} className="kitchen-row" ariaLabel={`Open ${k.name}`} onClick={() => openModal({ kind: 'cook', cookId: k.id })}>
              <img src={k.image} alt={`${k.name} food`} loading="lazy" />
              <div className="kitchen-copy">
                <div>
                  <span className="tag">✓ Verified</span>
                  <h3>{k.name}</h3>
                  <p>{k.cuisine}</p>
                </div>
                <div className="kitchen-meta">
                  <span>
                    ★ {k.rating} ({k.reviews})
                  </span>
                  <span>{k.distance}</span>
                </div>
              </div>
            </ClickableCard>
          ))
        ) : (
          <EmptyState icon="⌕" title="No kitchens yet" body="Try a cuisine, dish, or another neighbourhood." />
        )}
      </section>
    </>
  );
}
