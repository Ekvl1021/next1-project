"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Icon from "./Icon";
export default function Modal({ open, title, onClose, busy = false, children }: { open: boolean; title: string; onClose: () => void; busy?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (open && dialog && !dialog.open) dialog.showModal(); else if (!open && dialog?.open) dialog.close(); }, [open]);
  return <dialog ref={ref} className="sg-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <div className="sg-dialog-header"><div><span className="sg-eyebrow">EDURA</span><h2>{title}</h2></div><button type="button" className="sg-icon-button" aria-label="Цонх хаах" disabled={busy} onClick={onClose}><Icon name="close" /></button></div>{children}
  </dialog>;
}
