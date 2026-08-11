import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAppStore } from './store/appStore';
import type { Kitchen } from './data/types';

function renderApp() {
  window.history.pushState({}, '', '/');
  return render(
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>,
  );
}

// There's no mock-data fallback anymore (catalogKitchens is empty until a
// real fetch succeeds) — tests that need kitchens/dishes on screen supply
// their own fixture via catalogKitchens/catalogLoaded, same pattern as
// orders-flow.test.tsx's beforeEach.
const TEST_KITCHENS: Kitchen[] = [
  {
    id: 'k1',
    name: 'Test Kitchen',
    cook: 'Test Cook',
    cuisine: 'Test cuisine',
    rating: '4.9',
    reviews: '10',
    distance: '1 km',
    time: 'Today',
    image: 'https://example.com/kitchen.jpg',
    avatar: 'https://example.com/avatar.jpg',
    bio: 'A test kitchen.',
    dishes: [
      {
        id: 'd1',
        name: 'Test Dish',
        description: 'A test dish',
        price: 100,
        image: 'https://example.com/dish.jpg',
        tags: [],
        isTodaysSpecial: true,
        specialPortionsLeft: 5,
      },
    ],
  },
];

beforeEach(() => {
  useAppStore.setState({
    cart: [],
    modal: null,
    search: '',
    exploreCategory: 'All',
    activeChip: 'For you',
    cookTab: 'Overview',
    adminTab: 'Needs review',
    catalogKitchens: TEST_KITCHENS,
    catalogLoaded: true,
  });
});

afterEach(() => {
  cleanup();
});

describe('LOOM React app smoke test', () => {
  it('renders the home view on mount', () => {
    renderApp();
    expect(document.querySelector('h1')?.textContent).toContain('Good food has a');
    expect(document.querySelectorAll('.cook-card').length).toBe(1);
    expect(document.querySelectorAll('.special-card').length).toBe(1);
  });

  it('opens the cook profile modal when a special-card is clicked, without double-firing from the nested qty button', async () => {
    const user = userEvent.setup();
    renderApp();
    const specialCard = document.querySelector('.special-card')!;
    await user.click(specialCard);
    await waitFor(() => expect(document.querySelector('.modal-layer.visible')).toBeTruthy());
    expect(document.querySelector('.modal-layer')!.textContent).toContain('Test Kitchen');

    // clicking backdrop closes it
    await user.click(document.querySelector('.modal-layer')!);
    await waitFor(() => expect(document.querySelector('.modal-layer.visible')).toBeFalsy());
  });

  it('opens the stories modal when "Read more" is clicked', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByText('Read more'));
    await waitFor(() => expect(document.querySelector('.modal-layer')!.textContent).toContain('Stories from the stove'));
  });

  it('runs the full quantity-stepper lifecycle and keeps the cart badge in sync', async () => {
    const user = userEvent.setup();
    renderApp();
    const specialCard = document.querySelector('.special-card')!;
    const addBtn = within(specialCard as HTMLElement).getByLabelText(/^Add /);
    expect(addBtn.textContent).toBe('+');

    await user.click(addBtn);
    await waitFor(() => expect(within(specialCard as HTMLElement).getByText('1')).toBeInTheDocument());

    const plus = within(specialCard as HTMLElement).getByLabelText(/^Add one more/);
    await user.click(plus);
    await waitFor(() => expect(within(specialCard as HTMLElement).getByText('2')).toBeInTheDocument());

    const cartBadge = document.querySelector('.cart-nav b')!;
    expect(cartBadge.textContent).toBe('2');
    expect(cartBadge.className).toContain('show');

    const minus = within(specialCard as HTMLElement).getByLabelText(/^Remove one/);
    await user.click(minus);
    await user.click(within(specialCard as HTMLElement).getByLabelText(/^Remove one/));

    await waitFor(() => expect(within(specialCard as HTMLElement).getByLabelText(/^Add /).textContent).toBe('+'));
    expect(document.querySelector('.cart-nav b')!.className).not.toContain('show');
  });

  it('navigates via the bottom nav and supports real browser back/forward', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByText('Explore'));
    await waitFor(() => expect(screen.getByText('Explore kitchens')).toBeInTheDocument());
    expect(window.location.pathname).toBe('/explore');

    await user.click(screen.getByText('Basket'));
    await waitFor(() => expect(window.location.pathname).toBe('/cart'));
    expect(screen.getByText('Nothing delicious yet')).toBeInTheDocument();

    window.history.back();
    await waitFor(() => expect(window.location.pathname).toBe('/explore'));
  });

  it('redirects away from /admin when not logged in as an admin (real route guard, no more open mock desk)', async () => {
    renderApp();
    window.history.pushState({}, '', '/admin');
    // force a re-render at the new route since pushState alone doesn't notify React Router
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });

  it('redirects away from /cook when not a verified cook (real route guard, no more open mock dashboard)', async () => {
    renderApp();
    window.history.pushState({}, '', '/cook');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await waitFor(() => expect(window.location.pathname).toBe('/profile'));
  });
});
