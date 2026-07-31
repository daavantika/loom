import { useKitchens } from '../store/hooks';
import { currency } from '../lib/format';
import { todaysSpecials } from '../lib/specials';
import ModalHeader from '../components/ModalHeader';
import QtyControl from '../components/QtyControl';

export default function TodaySpecialsModal() {
  const kitchens = useKitchens();
  const specials = todaysSpecials(kitchens);

  return (
    <>
      <ModalHeader eyebrow="Cooked in small batches" title="Today’s specials" />
      <div className="special-list">
        {specials.map(({ dish, cook, left }) => (
          <article key={dish.id}>
            <img src={dish.image} alt={dish.name} loading="lazy" />
            <div>
              <span>{left}</span>
              <h3>{dish.name}</h3>
              <p>
                {cook} · {currency(dish.price)}
              </p>
            </div>
            <QtyControl dish={dish} />
          </article>
        ))}
      </div>
    </>
  );
}
