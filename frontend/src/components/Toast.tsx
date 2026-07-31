import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';

export default function Toast() {
  const toastMessage = useAppStore((s) => s.toastMessage);
  const toastNonce = useAppStore((s) => s.toastNonce);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (toastNonce === 0) return;
    setVisible(true);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(timerRef.current);
  }, [toastNonce]);

  return (
    <div className={`toast${visible ? ' show' : ''}`} role="status">
      {toastMessage}
    </div>
  );
}
