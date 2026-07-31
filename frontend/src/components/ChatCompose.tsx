import { useRef } from 'react';

export default function ChatCompose({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const send = () => {
    const value = inputRef.current?.value.trim();
    if (!value) return;
    onSend(value);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="chat-compose">
      <input
        ref={inputRef}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === 'Enter') send();
        }}
      />
      <button onClick={send} aria-label="Send message">
        ↑
      </button>
    </div>
  );
}
