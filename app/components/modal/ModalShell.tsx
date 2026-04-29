"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

type Width = "sm" | "md" | "lg" | "xl";

export default function ModalShell({
  isOpen,
  onClose,
  children,
  title,
  width = "md",
  isDirty = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: Width;
  isDirty?: boolean;
}) {
  // allow consumer to hide the built-in header when rendering a custom header inside children
  const hideHeader = (arguments[0] as any).hideHeader ?? false;
  const [show, setShow] = useState(isOpen);
  const [exiting, setExiting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
      document.body.style.overflow = "hidden";
    } else {
      // begin exit
      setExiting(true);
      document.body.style.overflow = "";
      window.setTimeout(() => {
        setShow(false);
        setExiting(false);
      }, 250);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isDirty) {
          setConfirmDiscard(true);
        } else {
          onClose();
        }
      }
      if (e.key === "Tab") {
        // simple focus trap
        const el = rootRef.current;
        if (!el) return;
        const focusables = el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement).focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
      }
    }

    if (show) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [show, isDirty, onClose]);

  if (!show) return null;

  const widthPx = width === "sm" ? 400 : width === "md" ? 640 : width === "lg" ? 720 : 900;

  function handleBackdropClick() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  }

  const modal = (
    <div className={`modal-root ${exiting ? "modal-card-exit-active" : "modal-card-enter-active"}`}>
      <div className={`modal-backdrop ${exiting ? "modal-backdrop-exit-active" : "modal-backdrop-enter-active"}`} onClick={handleBackdropClick} />

      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className="modal-card"
        style={{ maxWidth: widthPx }}
      >
        <div className="modal-header">
          <div className="modal-title" id="modal-title">{title}</div>
          <button aria-label="Close" className="modal-close-text" onClick={() => { if (isDirty) setConfirmDiscard(true); else onClose(); }}>
            Close
          </button>
        </div>

        <div className="modal-body modal-content">{children}</div>

        {/* footer is expected to be included by children when needed */}
      </div>

      {confirmDiscard ? (
        <div className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="bg-white modal-card p-6 w-[360px]">
            <h4 className="text-lg font-semibold">You have unsaved changes</h4>
            <p className="mt-2 text-sm text-slate-600">Discard your changes and close?</p>
            <div className="mt-4 flex justify-end gap-3">
              <button className="rounded-[8px] border px-4 py-2 text-sm" onClick={() => setConfirmDiscard(false)}>Keep Editing</button>
              <button className="rounded-[8px] bg-red-600 px-4 py-2 text-sm text-white" onClick={() => { setConfirmDiscard(false); onClose(); }}>Discard</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (typeof document !== "undefined") {
    return ReactDOM.createPortal(modal, document.body);
  }

  return null;
}
