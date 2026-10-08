import { AnimatePresence, motion } from 'framer-motion';
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastCtx = createContext(() => {});

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  const show = useCallback((text) => {
    clearTimeout(timer.current);
    setMsg({ text, id: Date.now() });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <AnimatePresence>
        {msg && (
          <motion.div
            key={msg.id}
            className="toast"
            role="status"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
