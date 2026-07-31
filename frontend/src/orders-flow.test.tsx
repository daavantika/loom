import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAppStore } from './store/appStore';
import { clearSession } from './lib/auth';

/**
 * Establishes the mocked-fetch + waitFor pattern for exercising real
 * network-backed flows through the actual UI (not just calling store actions
 * directly) — reuse this pattern for future backend-integration tests.
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const COOK = {
  id: 'cook-1',
  kitchenName: 'Test Kitchen',
  ownerName: 'Test Cook',
  area: 'RS Puram',
  minOrderValuePaise: 0,
  verified: true,
  photos: [],
};
const MENU_ITEM = { id: 'item-1', cookId: 'cook-1', name: 'Test Dish', pricePaise: 10000, tags: [], active: true };
const ORDER = {
  id: 'order-1',
  customerId: 'customer-1',
  cookId: 'cook-1',
  deliveryAddressLabel: 'Delivery address',
  deliveryAddressLine: 'RS Puram, Coimbatore',
  status: 'PLACED',
  subtotalPaise: 10000,
  deliveryFeePaise: 0,
  totalPaise: 10000,
  paymentStatus: 'COD',
  paymentMethod: 'COD',
  items: [{ id: 'oi-1', menuItemId: 'item-1', name: 'Test Dish', pricePaise: 10000, quantity: 1, lineTotalPaise: 10000 }],
  createdAt: new Date().toISOString(),
};

function setupFetchMock() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method ?? 'GET';

    if (url.endsWith('/auth/register') && method === 'POST') {
      return jsonResponse({ accessToken: 't', userId: 'user-1', email: 'test@loom.test', role: 'CUSTOMER' }, 201);
    }
    if (url.includes('/cooks?verifiedOnly=true') && method === 'GET') return jsonResponse([COOK]);
    if (url.endsWith('/cooks/cook-1/menu') && method === 'GET') return jsonResponse([MENU_ITEM]);
    if (url.endsWith('/customers/me/addresses') && method === 'GET') return jsonResponse([]);
    if (url.endsWith('/customers/me/addresses') && method === 'POST') {
      return jsonResponse({ id: 'addr-1', customerId: 'customer-1', label: 'Delivery address', addressLine: 'RS Puram, Coimbatore', isDefault: true }, 201);
    }
    if (url.endsWith('/orders') && method === 'POST') return jsonResponse(ORDER, 201);
    if (url.endsWith('/orders/mine') && method === 'GET') return jsonResponse([ORDER]);
    return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
  });
}

function renderApp() {
  window.history.pushState({}, '', '/');
  return render(
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>,
  );
}

function goTo(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

beforeEach(() => {
  clearSession();
  useAppStore.setState({
    cart: [],
    modal: null,
    auth: null,
    orders: [],
    catalogKitchens: [],
    catalogLoaded: false,
    followed: new Set(),
    customerProfile: null,
    paymentsConfig: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (window as any).Razorpay;
});

describe('Auth → catalog → checkout → orders flow (real backend calls, mocked)', () => {
  it('requires login before checkout, then places a real order visible on /orders', async () => {
    setupFetchMock();
    const user = userEvent.setup();
    renderApp();

    await act(async () => {
      await useAppStore.getState().loadCatalog();
    });

    goTo('/explore');
    await waitFor(() => expect(screen.getByText('Test Kitchen')).toBeInTheDocument());

    await user.click(screen.getByText('Test Kitchen'));
    await waitFor(() => expect(screen.getByText('Test Dish')).toBeInTheDocument());
    await user.click(screen.getByText('Add a meal'));

    goTo('/cart');
    await waitFor(() => expect(screen.getByText(/Continue to payment/)).toBeInTheDocument());
    await user.click(screen.getByText(/Continue to payment/));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument());

    await user.click(screen.getByText('New here? Create an account'));
    await user.type(screen.getByLabelText('Email'), 'test@loom.test');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByText('Create account'));
    await waitFor(() => expect(useAppStore.getState().auth).not.toBeNull());

    await user.click(screen.getByText(/Continue to payment/));
    await waitFor(() => expect(screen.getByText('One last step')).toBeInTheDocument());
    await user.click(screen.getByText(/Place order/));

    await waitFor(() => expect(window.location.pathname).toBe('/orders'));
    await waitFor(() => expect(screen.getAllByText('Test Kitchen').length).toBeGreaterThan(0));
    expect(screen.getByText(/Test Dish/)).toBeInTheDocument();
  });
});

class MockRazorpay {
  private options: any;
  constructor(options: any) {
    this.options = options;
  }
  open() {
    // Simulates the customer completing payment instantly — real
    // Checkout.js isn't loaded in jsdom, so window.Razorpay is stubbed
    // directly (loadRazorpayCheckout short-circuits once it's already set).
    this.options.handler({ razorpay_payment_id: 'pay_test1', razorpay_order_id: this.options.order_id, razorpay_signature: 'sig_test1' });
  }
}

describe('Checkout payment method selection', () => {
  async function addDishAndOpenCheckout(user: ReturnType<typeof userEvent.setup>) {
    await act(async () => {
      await useAppStore.getState().loadCatalog();
    });
    goTo('/explore');
    await waitFor(() => expect(screen.getByText('Test Kitchen')).toBeInTheDocument());
    await user.click(screen.getByText('Test Kitchen'));
    await waitFor(() => expect(screen.getByText('Test Dish')).toBeInTheDocument());
    await user.click(screen.getByText('Add a meal'));
    goTo('/cart');
    await waitFor(() => expect(screen.getByText(/Continue to payment/)).toBeInTheDocument());
    await user.click(screen.getByText(/Continue to payment/));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'One last step' })).toBeInTheDocument());
  }

  it('defaults to Cash on delivery and sends paymentMethod: COD when payments are not configured', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (init?.body) calls.push({ url, method, body: JSON.parse(init.body as string) });
      if (url.includes('/cooks?verifiedOnly=true') && method === 'GET') return jsonResponse([COOK]);
      if (url.endsWith('/cooks/cook-1/menu') && method === 'GET') return jsonResponse([MENU_ITEM]);
      if (url.endsWith('/customers/me/addresses') && method === 'GET') return jsonResponse([]);
      if (url.endsWith('/customers/me/addresses') && method === 'POST') {
        return jsonResponse({ id: 'addr-1', customerId: 'customer-1', label: 'Delivery address', addressLine: 'RS Puram, Coimbatore', isDefault: true }, 201);
      }
      if (url.endsWith('/orders') && method === 'POST') return jsonResponse(ORDER, 201);
      if (url.endsWith('/orders/mine') && method === 'GET') return jsonResponse([ORDER]);
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    useAppStore.setState({ auth: { accessToken: 't', userId: 'user-1', email: 'test@loom.test', role: 'CUSTOMER' }, paymentsConfig: { enabled: false, keyId: null } });
    renderApp();

    await addDishAndOpenCheckout(user);
    expect(screen.queryByText(/Pay online/)).not.toBeInTheDocument();

    await user.click(screen.getByText(/Place order/));
    await waitFor(() => expect(window.location.pathname).toBe('/orders'));

    const orderCall = calls.find((c) => c.url.endsWith('/orders') && c.method === 'POST');
    expect(orderCall?.body).toMatchObject({ paymentMethod: 'COD' });
  });

  it('lets a customer choose Pay online, opens the Razorpay checkout, and verifies the payment', async () => {
    (window as any).Razorpay = MockRazorpay;
    const calls: { url: string; method: string; body?: unknown }[] = [];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (init?.body) calls.push({ url, method, body: JSON.parse(init.body as string) });
      if (url.includes('/cooks?verifiedOnly=true') && method === 'GET') return jsonResponse([COOK]);
      if (url.endsWith('/cooks/cook-1/menu') && method === 'GET') return jsonResponse([MENU_ITEM]);
      if (url.endsWith('/customers/me/addresses') && method === 'GET') return jsonResponse([]);
      if (url.endsWith('/customers/me/addresses') && method === 'POST') {
        return jsonResponse({ id: 'addr-1', customerId: 'customer-1', label: 'Delivery address', addressLine: 'RS Puram, Coimbatore', isDefault: true }, 201);
      }
      if (url.endsWith('/orders') && method === 'POST') {
        return jsonResponse(
          { ...ORDER, paymentMethod: 'ONLINE', paymentStatus: 'PENDING', razorpay: { orderId: 'order_rzp1', amountPaise: 10000, keyId: 'rzp_test_key' } },
          201,
        );
      }
      if (url.endsWith('/orders/order-1/verify-payment') && method === 'POST') {
        return jsonResponse({ ...ORDER, paymentMethod: 'ONLINE', paymentStatus: 'PAID' }, 201);
      }
      if (url.endsWith('/orders/mine') && method === 'GET') return jsonResponse([ORDER]);
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    useAppStore.setState({
      auth: { accessToken: 't', userId: 'user-1', email: 'test@loom.test', role: 'CUSTOMER' },
      paymentsConfig: { enabled: true, keyId: 'rzp_test_key' },
    });
    renderApp();

    await addDishAndOpenCheckout(user);
    await user.click(screen.getByText(/Pay online/));
    await user.click(screen.getByText(/Place order/));

    await waitFor(() => expect(window.location.pathname).toBe('/orders'));

    const orderCall = calls.find((c) => c.url.endsWith('/orders') && c.method === 'POST');
    expect(orderCall?.body).toMatchObject({ paymentMethod: 'ONLINE' });

    const verifyCall = calls.find((c) => c.url.endsWith('/orders/order-1/verify-payment'));
    expect(verifyCall?.body).toEqual({ razorpayPaymentId: 'pay_test1', razorpaySignature: 'sig_test1' });
  });
});
