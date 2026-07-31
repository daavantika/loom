import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import { currency } from '../lib/format';
import EmptyState from '../components/EmptyState';

const DELIVERY_SLOTS = ['Today · 6–7 pm', 'Tomorrow · 12:30–1:30 pm', 'Fri · 7–8 pm'];

export default function Cart() {
  const navigate = useNavigate();
  const cart = useAppStore((s) => s.cart);
  const kitchens = useKitchens();
  const clearCart = useAppStore((s) => s.clearCart);
  const delivery = useAppStore((s) => s.delivery);
  const setDelivery = useAppStore((s) => s.setDelivery);
  const cartTotal = useAppStore((s) => s.cartTotal());
  const changeQuantity = useAppStore((s) => s.changeQuantity);
  const openModal = useAppStore((s) => s.openModal);
  const auth = useAppStore((s) => s.auth);
  const showToast = useAppStore((s) => s.showToast);

  const goToCheckout = () => {
    if (!auth) {
      showToast('Log in to place your order');
      openModal({ kind: 'auth', mode: 'login' });
      return;
    }
    openModal({ kind: 'checkout' });
  };

  if (!cart.length) {
    return (
      <>
        <div className="screen-title">
          <h1>Your basket</h1>
        </div>
        <EmptyState
          icon="♧"
          title="Nothing delicious yet"
          body="Meals here are prepared to your schedule, by people around you."
          action={
            <button className="primary-button" onClick={() => navigate('/explore')}>
              Find a kitchen
            </button>
          }
        />
      </>
    );
  }

  const groups = new Map<string, typeof cart>();
  for (const item of cart) {
    const list = groups.get(item.kitchenId) ?? [];
    list.push(item);
    groups.set(item.kitchenId, list);
  }
  const deliveryFee = 42;
  const platformFee = 10;
  const total = cartTotal + deliveryFee + platformFee;

  return (
    <>
      <div className="screen-title">
        <h1>Your basket</h1>
        <button onClick={clearCart}>Clear</button>
      </div>
      {[...groups.entries()].map(([kitchenId, items]) => {
        const kitchen = kitchens.find((k) => k.id === kitchenId);
        return (
          <section className="cart-card" key={kitchenId}>
            <div className="cart-cook">
              <span>♨</span>
              {kitchen?.name}
            </div>
            {items.map((item) => (
              <article className="cart-item" key={item.dish.id}>
                <img src={item.dish.image} alt={item.dish.name} loading="lazy" />
                <div>
                  <h3>{item.dish.name}</h3>
                  <p>{item.dish.tags.join(' · ')}</p>
                  <strong>{currency(item.dish.price)}</strong>
                </div>
                <div className="quantity">
                  <button onClick={() => changeQuantity(item.dish.id, -1)} aria-label={`Decrease quantity of ${item.dish.name}`}>
                    −
                  </button>
                  <b>{item.quantity}</b>
                  <button onClick={() => changeQuantity(item.dish.id, 1)} aria-label={`Increase quantity of ${item.dish.name}`}>
                    +
                  </button>
                </div>
              </article>
            ))}
          </section>
        );
      })}
      <section className="delivery-picker">
        <h3>When should it arrive?</h3>
        <div className="delivery-options">
          {DELIVERY_SLOTS.map((slot) => {
            const [day, time] = slot.split(' · ');
            return (
              <button key={slot} className={delivery === slot ? 'selected' : ''} onClick={() => setDelivery(slot)}>
                {day}
                <br />
                {time}
              </button>
            );
          })}
        </div>
      </section>
      <section className="cost-breakdown">
        <div>
          <span>Food total</span>
          <span>{currency(cartTotal)}</span>
        </div>
        <div>
          <span>Kovai Delivery</span>
          <span>{currency(deliveryFee)}</span>
        </div>
        <div>
          <span>Platform fee</span>
          <span>{currency(platformFee)}</span>
        </div>
        <div className="total">
          <span>Total</span>
          <span>{currency(total)}</span>
        </div>
      </section>
      <button className="primary-button checkout" onClick={goToCheckout}>
        Continue to payment · {currency(total)}
      </button>
    </>
  );
}
