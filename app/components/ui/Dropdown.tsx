import { useState, useRef, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

export type DropdownProps = {
  trigger: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
};

function Dropdown({ trigger, children, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <div
        onClick={() => setOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        {trigger}
      </div>

      {open && (
        <div
          className={`absolute z-40 mt-1.5 min-w-[180px] rounded-lg border border-zinc-200 bg-white py-1 shadow-[0_4px_24px_rgba(0,0,0,0.12)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
          role="menu"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export type DropdownItemProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

function DropdownItem({ children, onClick, disabled = false }: DropdownItemProps) {
  return (
    <button
      className="flex w-full items-center px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export { Dropdown, DropdownItem };
