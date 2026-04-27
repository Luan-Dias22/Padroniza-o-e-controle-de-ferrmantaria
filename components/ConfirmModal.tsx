import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Excluir',
  confirmColor = 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20'
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  confirmColor?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-zinc-900 border border-white/105 rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 to-orange-500/50" />
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-zinc-900/80">
              <h3 className="font-bold text-white">{title}</h3>
              <button onClick={onCancel} className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-1.5 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-transparent/30">
              <p className="text-zinc-300 text-sm leading-relaxed">{message}</p>
            </div>
            <div className="p-5 border-t border-white/5 flex justify-end gap-3 bg-zinc-900/80">
              <button
                onClick={onCancel}
                className="px-5 py-2.5 text-sm font-medium text-zinc-300 border border-white/105 rounded-xl hover:bg-zinc-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all ${confirmColor}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
