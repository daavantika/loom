import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import { currency } from '../lib/format';
import { todaysSpecials } from '../lib/specials';
import { foodImages } from '../data/kitchens';
import ClickableCard from '../components/ClickableCard';
import QtyControl from '../components/QtyControl';

const CHIPS = ['For you', 'Today’s specials', 'Tiffin plans', 'Festival foods', 'Catering'];

export default function Home() {
  const navigate = useNavigate();
  const kitchens = useKitchens();
  const search = useAppStore((s) => s.search);
  const setSearch = useAppStore((s) => s.setSearch);
  const activeChip = useAppStore((s) => s.activeChip);
  const setActiveChip = useAppStore((s) => s.setActiveChip);
  const openModal = useAppStore((s) => s.openModal);

  const specials = todaysSpecials(kitchens);

  const onChip = (chip: string) => {
    setActiveChip(chip);
    if (chip === 'Today’s specials') return openModal({ kind: 'todaySpecials' });
    if (chip === 'Tiffin plans') return openModal({ kind: 'plan' });
    if (chip === 'Festival foods') return openModal({ kind: 'festivalFoods' });
    if (chip === 'Catering') return openModal({ kind: 'catering' });
  };

  return (
    <>
      <p className="eyebrow">Made close to home</p>
      <h1>
        Good food has a
        <br />
        person behind it.
      </h1>
      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cooks, dishes, cuisines…" aria-label="Search" />
        <button className="filter-trigger" onClick={() => openModal({ kind: 'filters' })} aria-label="Open filters">
          ≡
        </button>
      </div>
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} className={`chip${activeChip === c ? ' active' : ''}`} onClick={() => onChip(c)}>
            {c}
          </button>
        ))}
      </div>
      <section className="hero-card">
        <p className="eyebrow">Weekend table</p>
        <h2>Sunday lunch, from a kitchen you’ll love.</h2>
        <p>Scheduled for your table, prepared with care.</p>
        <button className="pill-button" onClick={() => openModal({ kind: 'cook', cookId: 'meera' })}>
          Meet Meera →
        </button>
      </section>

      <div className="section-head">
        <h2>People near you</h2>
        <button onClick={() => navigate('/explore')}>See all</button>
      </div>
      <div className="h-scroll">
        {kitchens.map((k) => (
          <ClickableCard key={k.id} className="cook-card" ariaLabel={`Open ${k.name}`} onClick={() => openModal({ kind: 'cook', cookId: k.id })}>
            <div className="image-wrap">
              <img src={k.image} alt={`${k.name} food`} loading="lazy" />
              <span className="verified">✓ Verified kitchen</span>
            </div>
            <div className="card-copy">
              <h3>{k.name}</h3>
              <p>
                <span className="rating">★ {k.rating}</span> · {k.distance}
              </p>
            </div>
          </ClickableCard>
        ))}
      </div>

      <div className="section-head">
        <h2>Today’s specials</h2>
        <button onClick={() => navigate('/explore')}>See all</button>
      </div>
      <div className="h-scroll">
        {specials.map(({ dish, cook, cookId, left }) => (
          <ClickableCard key={dish.id} className="special-card" ariaLabel={`Open ${cook}`} onClick={() => openModal({ kind: 'cook', cookId })}>
            <img src={dish.image} alt={dish.name} loading="lazy" />
            <div className="special-info">
              <h3>{dish.name}</h3>
              <p>{cook}</p>
              <span className="quantity-note">{left}</span>
              <div className="special-row">
                <strong>{currency(dish.price)}</strong>
                <QtyControl dish={dish} style="add-mini" />
              </div>
            </div>
          </ClickableCard>
        ))}
      </div>

      <section className="section-head">
        <h2>Your week, sorted</h2>
      </section>
      <article className="plan-card">
        <div className="plan-icon">☼</div>
        <div>
          <h3>Fresh tiffins, your rhythm</h3>
          <p>Choose a cook. Pick your days. Pause any week.</p>
        </div>
        <button onClick={() => openModal({ kind: 'plan' })} aria-label="Explore tiffin plans">
          →
        </button>
      </article>

      <div className="section-head">
        <h2>Stories from the stove</h2>
        <button onClick={() => openModal({ kind: 'stories' })}>Read more</button>
      </div>
      <div className="h-scroll">
        <ClickableCard className="story-card" ariaLabel="Read stories from the stove" onClick={() => openModal({ kind: 'stories' })}>
          <img src={foodImages.story} alt="Handmade dessert" loading="lazy" />
          <div className="card-copy">
            <h3>Why I still hand-grind my masalas</h3>
          </div>
        </ClickableCard>
        <ClickableCard className="story-card" ariaLabel="Read stories from the stove" onClick={() => openModal({ kind: 'stories' })}>
          <img src={foodImages.dosa} alt="South Indian breakfast" loading="lazy" />
          <div className="card-copy">
            <h3>A tiffin ritual from Pollachi</h3>
          </div>
        </ClickableCard>
        <ClickableCard className="story-card" ariaLabel="Read stories from the stove" onClick={() => openModal({ kind: 'stories' })}>
          <img src={foodImages.sweets} alt="Festival sweets" loading="lazy" />
          <div className="card-copy">
            <h3>My grandmother’s Diwali murukku</h3>
          </div>
        </ClickableCard>
      </div>
    </>
  );
}
