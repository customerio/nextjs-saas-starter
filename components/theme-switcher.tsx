"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

import { readThemeChoice, setThemeChoice, type ThemeChoice } from "@/lib/theme";

/**
 * A quiet icon button that opens a three-item menu: Light, Dark, System.
 * The theme itself is applied before paint by the script in app/layout.tsx;
 * this only changes and shows the choice.
 */

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function subscribe(onChange: () => void) {
  window.addEventListener("acme-theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("acme-theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function Icon({
  choice,
  className = "size-[1.125rem]",
}: {
  choice: ThemeChoice;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 20 20",
    "aria-hidden": true,
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (choice === "light") {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="3.25" />
        <path d="M10 2.75v1.5M10 15.75v1.5M2.75 10h1.5M15.75 10h1.5M4.87 4.87l1.06 1.06M14.07 14.07l1.06 1.06M4.87 15.13l1.06-1.06M14.07 5.93l1.06-1.06" />
      </svg>
    );
  }
  if (choice === "dark") {
    return (
      <svg {...common}>
        <path d="M16.25 12.1A6.5 6.5 0 0 1 7.9 3.75a6.5 6.5 0 1 0 8.35 8.35Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="2.75" y="3.75" width="14.5" height="10" rx="1.75" />
      <path d="M7.5 16.75h5M10 13.75v3" />
    </svg>
  );
}

export function ThemeSwitcher() {
  // The server can't know the saved choice, so it renders "system"; the
  // client switches to the real one right after hydration. Same size, no shift.
  const choice = useSyncExternalStore(subscribe, readThemeChoice, () => "system" as const);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const current = OPTIONS.findIndex((option) => option.value === choice);
    items.current[current === -1 ? 0 : current]?.focus();
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
    // Focus the checked item only when the menu opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.current.findIndex((item) => item === document.activeElement);
    const move = (to: number) => {
      event.preventDefault();
      items.current[(to + OPTIONS.length) % OPTIONS.length]?.focus();
    };
    if (event.key === "ArrowDown") move(index + 1);
    else if (event.key === "ArrowUp") move(index - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(OPTIONS.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const label = OPTIONS.find((option) => option.value === choice)?.label ?? "System";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={`Theme: ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex size-11 items-center justify-center rounded-[10px] text-muted transition-[background-color,color] duration-150 ease-out hover:bg-sunken hover:text-ink aria-expanded:bg-sunken aria-expanded:text-ink"
      >
        <Icon choice={choice} />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Theme"
          onKeyDown={onMenuKey}
          className="absolute top-full right-0 z-30 mt-1.5 w-40 origin-top-right animate-popover-in rounded-xl bg-surface p-1 shadow-overlay"
        >
          {OPTIONS.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => {
                items.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={choice === option.value}
              tabIndex={-1}
              onClick={() => {
                setThemeChoice(option.value);
                close(true);
              }}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-start text-[0.9375rem] text-muted outline-none hover:bg-sunken hover:text-ink focus-visible:bg-sunken focus-visible:text-ink aria-checked:text-ink sm:min-h-10"
            >
              <Icon choice={option.value} className="size-4" />
              <span className="flex-1">{option.label}</span>
              {choice === option.value ? (
                <svg
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="m3.5 8.4 2.9 2.9 6.1-6.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
