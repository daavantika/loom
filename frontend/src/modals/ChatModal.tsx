import { useEffect } from 'react';
import { useKitchens } from '../store/hooks';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';
import ChatCompose from '../components/ChatCompose';

const POLL_MS = 4000;

export default function ChatModal({ cookId }: { cookId: string }) {
  const kitchens = useKitchens();
  const kitchen = kitchens.find((k) => k.id === cookId);
  const auth = useAppStore((s) => s.auth);
  const thread = useAppStore((s) => s.chatThread);
  const threadCookId = useAppStore((s) => s.chatThreadCookId);
  const loading = useAppStore((s) => s.chatThreadLoading);
  const loadChatThread = useAppStore((s) => s.loadChatThread);
  const sendChatMessage = useAppStore((s) => s.sendChatMessage);
  const openModal = useAppStore((s) => s.openModal);
  const showToast = useAppStore((s) => s.showToast);

  useEffect(() => {
    if (!auth) return;
    loadChatThread(cookId);
    const interval = setInterval(() => loadChatThread(cookId), POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, cookId]);

  if (!kitchen) return null;

  if (!auth) {
    return (
      <>
        <ModalHeader eyebrow={kitchen.name} title={`Chat with ${kitchen.cook.split(' ')[0]}`} />
        <p style={{ padding: '0 20px', color: 'var(--muted)' }}>Log in to message this kitchen.</p>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => openModal({ kind: 'auth', mode: 'login' })}>
            Log in / Sign up
          </button>
        </div>
      </>
    );
  }

  const messages = threadCookId === cookId ? thread : [];

  const send = async (text: string) => {
    const result = await sendChatMessage(cookId, text);
    if (!result.ok) showToast(result.message);
  };

  return (
    <>
      <ModalHeader eyebrow={kitchen.name} title={`Chat with ${kitchen.cook.split(' ')[0]}`} />
      <div className="chat-list">
        {loading && messages.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '0 4px' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13, padding: '0 4px' }}>
            Say hello — ask about ingredients, spice level, or a custom request.
          </p>
        ) : (
          messages.map((m) => (
            <div className={`bubble${m.senderRole === 'CUSTOMER' ? ' me' : ''}`} key={m.id}>
              {m.body}
            </div>
          ))
        )}
      </div>
      <ChatCompose placeholder="Write a message" onSend={send} />
    </>
  );
}
