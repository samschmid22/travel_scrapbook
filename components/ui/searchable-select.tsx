"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  secondaryLabel?: string;
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  selectedValue?: string;
  options: SearchableOption[];
  query: string;
  onQueryChange: (nextQuery: string) => void;
  onSelect: (option: SearchableOption) => void;
  emptyMessage: string;
  disabled?: boolean;
  helperText?: string;
}

export function SearchableSelect({
  label,
  placeholder,
  selectedValue,
  options,
  query,
  onQueryChange,
  onSelect,
  emptyMessage,
  disabled,
  helperText,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === selectedValue)?.label;
  }, [options, selectedValue]);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  return (
    <div ref={rootRef} className="space-y-2">
      <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          size={16}
        />
        <input
          type="text"
          disabled={disabled}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          placeholder={selectedLabel && query.length === 0 ? selectedLabel : placeholder}
          className={cn(
            "h-11 w-full rounded-2xl border border-[var(--border-soft)] bg-white pl-9 pr-10 text-sm shadow-sm outline-none transition",
            "placeholder:text-[var(--text-muted)] focus:border-[var(--accent-300)] focus:ring-2 focus:ring-[var(--accent-100)]",
            disabled ? "cursor-not-allowed opacity-60" : "",
          )}
          aria-label={label}
        />
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] transition-transform",
            open ? "rotate-180" : "",
          )}
          size={16}
        />

        {open ? (
          <div className="absolute z-30 mt-2 max-h-60 w-full overflow-auto rounded-2xl border border-[var(--border-soft)] bg-white p-1 shadow-xl">
            {options.length === 0 ? (
              <p className="px-3 py-3 text-sm text-[var(--text-muted)]">{emptyMessage}</p>
            ) : (
              <ul role="listbox" aria-label={`${label} options`}>
                {options.map((option) => {
                  const selected = option.value === selectedValue;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(option);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                          selected
                            ? "bg-[var(--accent-100)] text-[var(--text-primary)]"
                            : "hover:bg-[var(--surface-2)]",
                        )}
                      >
                        <span>
                          <span className="font-medium">{option.label}</span>
                          {option.secondaryLabel ? (
                            <span className="ml-1 text-[var(--text-muted)]">{option.secondaryLabel}</span>
                          ) : null}
                        </span>
                        {selected ? <Check size={16} className="text-[var(--accent-700)]" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      {helperText ? <p className="text-xs text-[var(--text-muted)]">{helperText}</p> : null}
    </div>
  );
}
