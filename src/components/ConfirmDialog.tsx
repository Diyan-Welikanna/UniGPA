'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const variants = {
  danger: {
    icon: (
      <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    ring: 'bg-red-500/10 border-red-500/20',
    confirmBtn: 'bg-red-600 hover:bg-red-500 shadow-red-900/40',
    iconBg: 'bg-red-500/15',
  },
  warning: {
    icon: (
      <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    ring: 'bg-amber-500/10 border-amber-500/20',
    confirmBtn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40',
    iconBg: 'bg-amber-500/15',
  },
  info: {
    icon: (
      <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    ring: 'bg-indigo-500/10 border-indigo-500/20',
    confirmBtn: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/40',
    iconBg: 'bg-indigo-500/15',
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const v = variants[variant];
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-[#1c1f2e] rounded-2xl border border-white/10 shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in">
        {/* Top accent stripe */}
        <div className={`h-1 w-full ${variant === 'danger' ? 'bg-gradient-to-r from-red-500 to-pink-500' : variant === 'warning' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} />

        <div className="p-6">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`shrink-0 w-11 h-11 rounded-xl ${v.iconBg} flex items-center justify-center`}>
              {v.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">{title}</h3>
              <p className="text-sm text-slate-400 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onConfirm}
              className={`flex-1 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-lg ${v.confirmBtn}`}
            >
              {confirmLabel}
            </button>
            <button
              ref={cancelRef}
              onClick={onCancel}
              className="flex-1 bg-white/5 text-slate-400 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition border border-white/10"
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
