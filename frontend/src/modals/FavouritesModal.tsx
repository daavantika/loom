import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useKitchens } from '../store/hooks';
import ModalHeader from '../components/ModalHeader';
import EmptyState from '../components/EmptyState';

export default function FavouritesModal() {
  const kitchens = useKitchens();
  const followed = useAppStore((s) => s.followed);
  const auth = useAppStore((s) => s.auth);
  const loadFavorites = useAppStore((s) => s.loadFavorites);
  const openModal = useAppStore((s) => s.openModal);

  useEffect(() => {
    if (auth) loadFavorites();
  }, [auth, loadFavorites]);

  if (!auth) {
    return (
      <>
        <ModalHeader title="Favourite cooks" />
        <EmptyState
          icon="♡"
          title="Log in to see favourites"
          body="Follow cooks to hear about new slots."
          action={
            <button className="primary-button" onClick={() => openModal({ kind: 'auth', mode: 'login' })}>
              Log in / Sign up
            </button>
          }
        />
      </>
    );
  }

  const favourites = kitchens.filter((k) => followed.has(k.id));

  return (
    <>
      <ModalHeader title="Favourite cooks" />
      {favourites.length === 0 ? (
        <EmptyState icon="♡" title="No favourites yet" body="Follow a cook from their profile to see them here." />
      ) : (
        <div className="favourite-list">
          {favourites.map((k) => (
            <button className="favourite-row" key={k.id} onClick={() => openModal({ kind: 'cook', cookId: k.id })}>
              <img src={k.avatar} alt={k.cook} loading="lazy" />
              <span>
                <strong>{k.name}</strong>
                <small>Following · slot alerts on</small>
              </span>
              <em>›</em>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
