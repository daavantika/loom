import { useState } from 'react';
import ModalHeader from '../components/ModalHeader';
import ChatCompose from '../components/ChatCompose';

export default function CustomerMessageModal({ name }: { name: string }) {
  const [myMessages, setMyMessages] = useState<string[]>([]);

  return (
    <>
      <ModalHeader eyebrow="Customer thread" title={name} />
      <div className="chat-list">
        <div className="bubble">Hi! I’m looking forward to my order. Please keep the spice medium.</div>
        {myMessages.map((m, i) => (
          <div className="bubble me" key={i}>
            {m}
          </div>
        ))}
      </div>
      <ChatCompose placeholder={`Reply to ${name}`} onSend={(text) => setMyMessages((m) => [...m, text])} />
    </>
  );
}
