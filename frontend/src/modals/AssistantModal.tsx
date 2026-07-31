import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';
import ChatCompose from '../components/ChatCompose';

const QUICK_ACTIONS: Array<{ label: string; prompt: string }> = [
  { label: 'Set up tiffins', prompt: 'Can you help me set up a weekday tiffin plan?' },
  { label: 'Festival food', prompt: 'What festival food options do you have?' },
  { label: 'Plan an event', prompt: 'I need catering for an event — what are my options?' },
];

export default function AssistantModal() {
  const messages = useAppStore((s) => s.assistantMessages);
  const loading = useAppStore((s) => s.assistantLoading);
  const sendAssistantMessage = useAppStore((s) => s.sendAssistantMessage);
  const showToast = useAppStore((s) => s.showToast);

  const send = async (text: string) => {
    const result = await sendAssistantMessage(text);
    if (!result.ok) showToast(result.message);
  };

  return (
    <>
      <ModalHeader eyebrow="Loom guide" title="What are you in the mood for?" />
      <div className="chat-list">
        {messages.length === 0 ? (
          <div className="bubble">
            I can find a cook for a calm vegan lunch, a last-minute birthday cake, or set up your weekday tiffins — ask me
            anything, or pick an option below.
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={`bubble${m.role === 'user' ? ' me' : ''}`} key={i}>
              {m.text}
            </div>
          ))
        )}
        {loading && <div className="bubble">Thinking…</div>}
      </div>
      <div className="option-grid">
        {QUICK_ACTIONS.map((action) => (
          <button className="option" key={action.label} onClick={() => send(action.prompt)} disabled={loading}>
            {action.label}
          </button>
        ))}
      </div>
      <ChatCompose placeholder="Ask about food, cooks or plans" onSend={send} />
    </>
  );
}
