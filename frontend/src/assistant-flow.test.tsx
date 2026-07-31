import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAppStore } from './store/appStore';

/** Phase 12: the AI assistant, replacing the old fully-scripted AssistantModal. */

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

beforeEach(() => {
  useAppStore.setState({ modal: null, assistantMessages: [], assistantLoading: false });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AI assistant (real backend, mocked)', () => {
  it('sends a real message to /assistant/chat and renders the real reply', async () => {
    const calls: { url: string; body?: unknown }[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (init?.body) calls.push({ url, body: JSON.parse(init.body as string) });
      if (url.endsWith('/assistant/chat')) {
        return jsonResponse({ reply: 'Meera’s Kitchen has a vegetarian comfort box open tomorrow at 12:30pm.' }, 201);
      }
      return jsonResponse({ message: `Unhandled mock request: ${url}` }, 404);
    });

    const user = userEvent.setup();
    renderApp();

    await act(async () => {
      useAppStore.setState({ modal: { kind: 'assistant' } });
    });

    await user.type(screen.getByPlaceholderText('Ask about food, cooks or plans'), 'Something wholesome for two tomorrow?');
    await user.click(screen.getByLabelText('Send message'));

    await waitFor(() => expect(screen.getByText(/vegetarian comfort box/)).toBeInTheDocument());

    expect(calls[0].body).toEqual({ messages: [{ role: 'user', text: 'Something wholesome for two tomorrow?' }] });
  });

  it('sends the real running history (not just the latest message) on a second turn', async () => {
    const calls: { url: string; body?: unknown }[] = [];
    let turn = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (init?.body) calls.push({ url, body: JSON.parse(init.body as string) });
      if (url.endsWith('/assistant/chat')) {
        turn += 1;
        return jsonResponse({ reply: turn === 1 ? 'How many people?' : 'Great, here are two options.' }, 201);
      }
      return jsonResponse({ message: `Unhandled mock request: ${url}` }, 404);
    });

    const user = userEvent.setup();
    renderApp();
    await act(async () => {
      useAppStore.setState({ modal: { kind: 'assistant' } });
    });

    await user.type(screen.getByPlaceholderText('Ask about food, cooks or plans'), 'Plan a lunch');
    await user.click(screen.getByLabelText('Send message'));
    await waitFor(() => expect(screen.getByText('How many people?')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Ask about food, cooks or plans'), 'Just two of us');
    await user.click(screen.getByLabelText('Send message'));
    await waitFor(() => expect(screen.getByText('Great, here are two options.')).toBeInTheDocument());

    expect(calls[1].body).toEqual({
      messages: [
        { role: 'user', text: 'Plan a lunch' },
        { role: 'assistant', text: 'How many people?' },
        { role: 'user', text: 'Just two of us' },
      ],
    });
  });

  it('a quick-action button sends a real starter prompt through the same pipeline', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/assistant/chat')) return jsonResponse({ reply: 'Sure — how many days a week?' }, 201);
      return jsonResponse({ message: `Unhandled mock request: ${url}` }, 404);
    });

    const user = userEvent.setup();
    renderApp();
    await act(async () => {
      useAppStore.setState({ modal: { kind: 'assistant' } });
    });

    await user.click(screen.getByText('Set up tiffins'));

    await waitFor(() => expect(screen.getByText('Can you help me set up a weekday tiffin plan?')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Sure — how many days a week?')).toBeInTheDocument());
  });
});
