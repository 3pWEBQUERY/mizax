import { useEffect } from 'react';

// Textfeld wächst mit dem Inhalt
export default function useAutosize(ref, value) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}
