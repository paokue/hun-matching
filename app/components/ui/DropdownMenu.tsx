import { useState, useRef } from "react";
import { createPortal } from "react-dom";

interface DropdownMenuProps {
  trigger: React.ReactNode;
  /** Receives a `close()` function so menu items can close after clicking. */
  children: (close: () => void) => React.ReactNode;
  width?: number; // px, defaults to 192 (w-48)
}

// 3-dots-style dropdown that renders into document.body via a portal,
// so the menu isn't clipped by overflow:hidden / overflow:auto parents.
export function DropdownMenu({ trigger, children, width = 192 }: DropdownMenuProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  function toggle() {
    if (open) { setOpen(false); return; }
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    setOpen(true);
  }
  function close() { setOpen(false); }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
        aria-label="Actions"
      >
        {trigger}
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={close} />
          <div
            className="fixed z-[70] bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 overflow-hidden"
            style={{ top: pos.top, right: pos.right, width }}
          >
            {children(close)}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
