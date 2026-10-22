"use client";

import React, { useEffect, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  accentColor?: "amber" | "emerald" | "zinc";
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  accentColor = "amber",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ringClass =
    accentColor === "emerald"
      ? "focus:border-emerald-400/70 focus:ring-emerald-400/20"
      : "focus:border-amber-400/70 focus:ring-amber-400/20";

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800/90 bg-gradient-to-b from-zinc-900 to-zinc-950 px-3.5 py-2.5 text-left text-xs font-semibold text-zinc-100 shadow-inner transition-all hover:border-zinc-700 focus:ring-2 focus:outline-none ${ringClass}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="shrink-0 rounded-md bg-amber-400/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400 ring-1 ring-amber-400/30">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-amber-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-zinc-700/80 bg-zinc-950/95 p-1.5 shadow-2xl ring-1 ring-black backdrop-blur-xl custom-scrollbar"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-amber-400/15 font-bold text-amber-300 ring-1 ring-amber-400/30"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate">{opt.label}</div>
                    {opt.sublabel && (
                      <div className="truncate text-[10px] text-zinc-500">
                        {opt.sublabel}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {opt.badge && (
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                          isSelected
                            ? "bg-amber-400 text-zinc-950"
                            : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800"
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <svg
                        className="h-3.5 w-3.5 text-amber-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
