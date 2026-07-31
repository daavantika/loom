import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAppStore } from './store/appStore';
import { clearSession } from './lib/auth';

/**
 * Phase 11: real cook<->customer messaging, replacing the old fully-mocked
 * ChatModal (hardcoded bubbles, never sent anywhere). Follows the
 * mocked-fetch pattern established in orders-flow.test.tsx.
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

const COOK = {
  id: 'cook-1',
  kitchenName: 'Test Kitchen',
  ownerName: 'Test Cook',
  area: 'RS Puram',
  minOrderValuePaise: 0,
  verified: true,
  photos: [],
};

beforeEach(() => {
  clearSession();
  useAppStore.setState({
    auth: null,
    modal: null,
    catalogKitchens: [],
    catalogLoaded: false,
    chatThread: [],
    chatThreadCookId: null,
    cookConversations: [],
    cookThread: [],
    activeConversationCustomerId: null,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Customer chat (ChatModal, real backend)', () => {
  it('prompts a logged-out customer to log in instead of showing a fake conversation', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/cooks?verifiedOnly=true')) return jsonResponse([COOK]);
      if (url.endsWith('/cooks/cook-1/menu')) return jsonResponse([]);
      return jsonResponse({ message: 'unhandled' }, 404);
    });

    renderApp();
    await act(async () => {
      await useAppStore.getState().loadCatalog();
    });
    act(() => {
      useAppStore.setState({ modal: { kind: 'chat', cookId: 'cook-1' } });
    });

    await waitFor(() => expect(screen.getByText('Log in to message this kitchen.')).toBeInTheDocument());
  });

  it('lets a logged-in customer load a real thread and send a message', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    let sent = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (init?.body) calls.push({ url, method, body: JSON.parse(init.body as string) });
      if (url.includes('/cooks?verifiedOnly=true')) return jsonResponse([COOK]);
      if (url.endsWith('/cooks/cook-1/menu')) return jsonResponse([]);
      if (url.endsWith('/cooks/cook-1/messages') && method === 'GET') {
        return jsonResponse(
          sent
            ? [{ id: 'm1', cookId: 'cook-1', customerId: 'customer-1', senderRole: 'CUSTOMER', body: 'Hi! Less spicy please?', createdAt: new Date().toISOString() }]
            : [],
        );
      }
      if (url.endsWith('/cooks/cook-1/messages') && method === 'POST') {
        sent = true;
        return jsonResponse({ id: 'm1', cookId: 'cook-1', customerId: 'customer-1', senderRole: 'CUSTOMER', body: 'Hi! Less spicy please?', createdAt: new Date().toISOString() }, 201);
      }
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    useAppStore.setState({ auth: { accessToken: 't', userId: 'user-1', email: 'test@loom.test', role: 'CUSTOMER' } });
    renderApp();
    await act(async () => {
      await useAppStore.getState().loadCatalog();
    });
    act(() => {
      useAppStore.setState({ modal: { kind: 'chat', cookId: 'cook-1' } });
    });

    await waitFor(() => expect(screen.getByText(/Say hello/)).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Write a message'), 'Hi! Less spicy please?');
    await user.click(screen.getByLabelText('Send message'));

    await waitFor(() => expect(screen.getByText('Hi! Less spicy please?')).toBeInTheDocument());

    const postCall = calls.find((c) => c.url.endsWith('/cooks/cook-1/messages') && c.method === 'POST');
    expect(postCall?.body).toEqual({ body: 'Hi! Less spicy please?' });
  });
});

describe('Cook Messages tab (real backend)', () => {
  it('lists a real conversation with an unread badge, and lets the cook reply', async () => {
    const calls: { url: string; method: string; body?: unknown }[] = [];
    let replied = false;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (init?.body) calls.push({ url, method, body: JSON.parse(init.body as string) });
      if (url.endsWith('/cooks/me') && method === 'GET') {
        return jsonResponse({
          id: 'cook-1',
          userId: 'user-1',
          kitchenName: 'Test Kitchen',
          ownerName: 'Test Cook',
          minOrderValuePaise: 0,
          status: 'PENDING_VERIFICATION',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: [],
          verified: true,
          verificationStatus: 'VERIFIED',
        });
      }
      if (url.endsWith('/cooks/me/conversations') && method === 'GET') {
        return jsonResponse([{ customerId: 'customer-1', customerName: 'Asha R.', lastMessage: 'Hi! Less spicy please?', lastMessageAt: new Date().toISOString(), unreadCount: replied ? 0 : 1 }]);
      }
      if (url.endsWith('/cooks/me/conversations/customer-1/messages') && method === 'GET') {
        return jsonResponse([{ id: 'm1', cookId: 'cook-1', customerId: 'customer-1', senderRole: 'CUSTOMER', body: 'Hi! Less spicy please?', createdAt: new Date().toISOString() }]);
      }
      if (url.endsWith('/cooks/me/conversations/customer-1/messages') && method === 'POST') {
        replied = true;
        return jsonResponse({ id: 'm2', cookId: 'cook-1', customerId: 'customer-1', senderRole: 'COOK', body: 'Sure, noted!', createdAt: new Date().toISOString() }, 201);
      }
      return jsonResponse({ message: `Unhandled mock request: ${method} ${url}` }, 404);
    });

    const user = userEvent.setup();
    useAppStore.setState({ auth: { accessToken: 't', userId: 'user-1', email: 'cook@loom.test', role: 'CUSTOMER' } });
    renderApp();

    goTo('/cook');
    act(() => {
      useAppStore.setState({ cookTab: 'Messages' });
    });

    await waitFor(() => expect(screen.getByText('Asha R.')).toBeInTheDocument());
    expect(document.querySelector('.cook-order .status')?.textContent).toBe('1'); // unread badge on the conversation row

    await user.click(screen.getByText('Asha R.'));
    await waitFor(() => expect(screen.getByText('Hi! Less spicy please?')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Write a reply'), 'Sure, noted!');
    await user.click(screen.getByLabelText('Send message'));

    const replyCall = calls.find((c) => c.url.endsWith('/cooks/me/conversations/customer-1/messages') && c.method === 'POST');
    await waitFor(() => expect(replyCall?.body).toEqual({ body: 'Sure, noted!' }));
  });
});
