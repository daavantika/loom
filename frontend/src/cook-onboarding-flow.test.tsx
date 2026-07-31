import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAppStore } from './store/appStore';
import { clearSession } from './lib/auth';

/**
 * Cook-side Phase 9.5 flows: a customer registering a kitchen, and an admin
 * approving/rejecting the resulting application — both driven through the
 * real UI against a mocked fetch, following the pattern established in
 * orders-flow.test.tsx.
 */

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
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
    auth: null,
    cookProfile: null,
    cookProfileChecked: false,
    moderationCases: [],
    moderationCasesLoading: false,
    customerProfile: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Kitchen registration flow (customer submits a real application)', () => {
  it('uploads a photo, submits the form, and lands back on the profile as pending review', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    let submitted = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      calls.push({ url, method, body });

      if (url.endsWith('/customers/me') && method === 'GET') return jsonResponse({ id: 'customer-1', displayName: 'Test Customer' });
      if (url.endsWith('/cooks/me') && method === 'GET') {
        if (!submitted) return jsonResponse({ message: 'Cook profile not found' }, 404);
        return jsonResponse({
          id: 'cook-1',
          userId: 'user-1',
          kitchenName: 'Meera Kitchen',
          minOrderValuePaise: 0,
          status: 'PENDING_VERIFICATION',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
          verified: false,
          verificationStatus: 'PENDING',
        });
      }
      if (url.endsWith('/uploads/files') && method === 'POST') {
        return jsonResponse({ url: 'https://api.loom.test/uploads/kitchen-1.jpg' }, 201);
      }
      if (url.endsWith('/cooks/onboarding') && method === 'POST') return jsonResponse({ id: 'cook-1' }, 201);
      if (url.endsWith('/cooks/onboarding/submit') && method === 'POST') {
        submitted = true;
        return jsonResponse({ id: 'verification-1' }, 201);
      }
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    useAppStore.setState({ auth: { accessToken: 't', userId: 'user-1', email: 'cook@loom.test', role: 'CUSTOMER' } });
    renderApp();

    goTo('/sell/register');
    await waitFor(() => expect(screen.getByText('Register your kitchen')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Kitchen name'), "Meera's Kitchen");
    await user.type(screen.getByLabelText('Your name'), 'Meera Krishnan');
    await user.type(screen.getByLabelText('Phone number'), '9876543210');
    await user.type(screen.getByLabelText('Area'), 'RS Puram');

    const photoInput = screen.getByText('+ Add kitchen photo').closest('label')!.querySelector('input')!;
    await user.upload(photoInput, new File(['fake-bytes'], 'kitchen.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(screen.getByAltText('Kitchen')).toBeInTheDocument());

    await user.type(screen.getByLabelText('UPI ID'), 'meera@upi');

    await user.click(screen.getByText('Submit for verification'));

    await waitFor(() => expect(window.location.pathname).toBe('/profile'));
    await waitFor(() => expect(useAppStore.getState().cookProfile?.verificationStatus).toBe('PENDING'));

    const onboarding = calls.find((c) => c.url.endsWith('/cooks/onboarding') && c.method === 'POST');
    expect(onboarding?.body).toMatchObject({ kitchenName: "Meera's Kitchen", ownerName: 'Meera Krishnan', phone: '9876543210', area: 'RS Puram' });
    const submit = calls.find((c) => c.url.endsWith('/cooks/onboarding/submit') && c.method === 'POST');
    expect(submit?.body).toMatchObject({ payoutMethod: 'UPI', payoutDetails: 'meera@upi' });
  });

  it('refuses to submit without at least one kitchen photo', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (url.endsWith('/customers/me') && method === 'GET') return jsonResponse({ id: 'customer-1', displayName: 'Test Customer' });
      if (url.endsWith('/cooks/me') && method === 'GET') return jsonResponse({ message: 'Cook profile not found' }, 404);
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    useAppStore.setState({ auth: { accessToken: 't', userId: 'user-1', email: 'cook@loom.test', role: 'CUSTOMER' } });
    renderApp();

    goTo('/sell/register');
    await waitFor(() => expect(screen.getByText('Register your kitchen')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Kitchen name'), "Meera's Kitchen");
    await user.type(screen.getByLabelText('Your name'), 'Meera Krishnan');
    await user.type(screen.getByLabelText('Phone number'), '9876543210');
    await user.type(screen.getByLabelText('Area'), 'RS Puram');
    await user.type(screen.getByLabelText('UPI ID'), 'meera@upi');
    await user.click(screen.getByText('Submit for verification'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Add at least one kitchen photo'));
    expect(window.location.pathname).toBe('/sell/register');
  });
});

describe('Admin moderation flow (approve/reject a real kitchen application)', () => {
  const CASE = {
    id: 'case-1',
    type: 'VERIFICATION',
    entityType: 'COOK',
    entityId: 'cook-1',
    status: 'OPEN' as const,
    openedAt: new Date().toISOString(),
    verification: { fssaiNumber: '12345678901234', payoutMethod: 'UPI' as const, type: 'INITIAL' as const, createdAt: new Date().toISOString() },
    cook: { id: 'cook-1', kitchenName: "Meera's Kitchen", ownerName: 'Meera Krishnan', area: 'RS Puram', deliveryRadiusKm: 5, bio: 'Home-style Chettinad food', photos: [] },
  };

  function loginAsAdmin() {
    useAppStore.setState({ auth: { accessToken: 'admin-t', userId: 'admin-1', email: 'admin@loom.test', role: 'ADMIN' } });
  }

  it('approves a kitchen application and removes it from the queue', async () => {
    let approved = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (url.endsWith('/admin/moderation/verifications') && method === 'GET') {
        return jsonResponse(approved ? [] : [CASE]);
      }
      if (url.endsWith('/admin/moderation/verifications/case-1/approve') && method === 'POST') {
        approved = true;
        return jsonResponse({ id: 'case-1', status: 'RESOLVED' });
      }
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    loginAsAdmin();
    renderApp();

    goTo('/admin');
    await waitFor(() => expect(screen.getByText("Meera's Kitchen")).toBeInTheDocument());
    expect(screen.getByText(/Meera Krishnan/)).toBeInTheDocument();
    expect(screen.getByText(/FSSAI: 12345678901234/)).toBeInTheDocument();

    await user.click(screen.getByText('Approve verification'));

    await waitFor(() => expect(screen.getByText('All caught up')).toBeInTheDocument());
  });

  it('rejects a kitchen application with a reason and removes it from the queue', async () => {
    let rejected = false;
    let rejectBody: unknown;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (url.endsWith('/admin/moderation/verifications') && method === 'GET') {
        return jsonResponse(rejected ? [] : [CASE]);
      }
      if (url.endsWith('/admin/moderation/verifications/case-1/reject') && method === 'POST') {
        rejected = true;
        rejectBody = init?.body ? JSON.parse(init.body as string) : undefined;
        return jsonResponse({ id: 'case-1', status: 'REJECTED' });
      }
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    loginAsAdmin();
    renderApp();

    goTo('/admin');
    await waitFor(() => expect(screen.getByText("Meera's Kitchen")).toBeInTheDocument());

    await user.click(screen.getByText('Reject'));
    await user.type(screen.getByPlaceholderText('Reason for rejection'), 'FSSAI document is illegible');
    await user.click(screen.getByText('Confirm reject'));

    await waitFor(() => expect(screen.getByText('All caught up')).toBeInTheDocument());
    expect(rejectBody).toEqual({ reason: 'FSSAI document is illegible' });
  });

  it('redirects a logged-in non-admin away from /admin', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]));
    useAppStore.setState({ auth: { accessToken: 't', userId: 'user-1', email: 'shopper@loom.test', role: 'CUSTOMER' } });
    renderApp();

    goTo('/admin');
    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});
