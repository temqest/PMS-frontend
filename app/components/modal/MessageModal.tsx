"use client";

import React, { useEffect, useMemo, useState } from "react";
import ModalShell from "./ModalShell";

export default function MessageModal({
  isOpen,
  onClose,
  onSend,
  recipient,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSend: (payload: { to?: string; body: string }) => void;
  recipient?: string;
}) {
  const [to, setTo] = useState(recipient ?? "");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTo(recipient ?? "");
      setBody("");
    }
  }, [isOpen, recipient]);

  const isDirty = useMemo(() => body.length > 0, [body]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    onSend({ to, body });
    onClose();
  }

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title="Send Message" width="sm" isDirty={isDirty}>
      <form onSubmit={send}>
        <label className="modal-label">To</label>
        <input className="modal-input" value={to} onChange={(e)=>setTo(e.target.value)} placeholder="Patient or provider" />

        <label className="modal-label mt-4">Message</label>
        <textarea className="modal-textarea" value={body} onChange={(e)=>setBody(e.target.value)} placeholder="Write a secure message..." />

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="rounded-[8px] border px-4 py-2">Cancel</button>
          <button type="submit" className="rounded-[8px] bg-[var(--accent-sage)] px-4 py-2 text-white">Send</button>
        </div>
      </form>
    </ModalShell>
  );
}
