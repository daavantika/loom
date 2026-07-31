import { useAppStore } from '../store/appStore';
import type { Dish } from '../data/types';

export default function QtyControl({ dish, style = '' }: { dish: Dish; style?: string }) {
  const qty = useAppStore((s) => s.quantityOf(dish.id));
  const addDish = useAppStore((s) => s.addDish);
  const changeQuantity = useAppStore((s) => s.changeQuantity);

  if (qty > 0) {
    return (
      <div className="quantity qty-control" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => changeQuantity(dish.id, -1)} aria-label={`Remove one ${dish.name}`}>
          −
        </button>
        <b>{qty}</b>
        <button onClick={() => changeQuantity(dish.id, 1)} aria-label={`Add one more ${dish.name}`}>
          +
        </button>
      </div>
    );
  }
  return (
    <button className={style} onClick={(e) => { e.stopPropagation(); addDish(dish.id); }} aria-label={`Add ${dish.name}`}>
      +
    </button>
  );
}
