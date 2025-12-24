"use client";

import { useState, useRef, useEffect } from "react";

interface FilterDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
}

export function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select...",
  searchable = true,
  disabled = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const filteredOptions = searchable
    ? options.filter((opt) => opt.toLowerCase().includes(search.toLowerCase()))
    : options;

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearAll = () => {
    onChange([]);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearch("");
    }
  };

  // Display text for selected items
  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
    ? selected[0]
    : `${selected.length} selected`;

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <label className="block text-xs text-white/50 mb-1.5 font-medium">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 rounded-lg text-sm text-left flex items-center justify-between
          transition-all duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
          ${disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-white/20"
          }
          ${isOpen ? "ring-2 ring-cyan-500/30" : ""}
        `}
        style={{
          background: "rgba(15, 20, 25, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`truncate ${selected.length > 0 ? "text-white" : "text-white/30"}`}>
          {displayText}
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          {selected.length > 0 && !disabled && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400"
            >
              {selected.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && !disabled && (
        <div
          className="absolute z-50 mt-1.5 w-full rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: "rgba(20, 25, 32, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(12px)",
          }}
          role="listbox"
          aria-multiselectable="true"
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2">
              <div className="relative">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full pl-8 pr-3 py-2 rounded-md text-sm bg-black/30 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-sm text-white/40 text-center">
                {search ? "No matches found" : "No options available"}
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <label
                    key={option}
                    className={`
                      flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
                      ${isSelected ? "bg-cyan-500/10" : "hover:bg-white/5"}
                    `}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition-all
                        ${isSelected
                          ? "bg-cyan-500 border-cyan-500"
                          : "border-white/20 hover:border-white/40"
                        }
                      `}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(option)}
                      className="sr-only"
                    />
                    <span className={`text-sm ${isSelected ? "text-white" : "text-white/70"}`}>
                      {option}
                    </span>
                  </label>
                );
              })
            )}
          </div>

          {/* Footer Actions */}
          {(selected.length > 0 || filteredOptions.length > 5) && (
            <div className="p-2 border-t border-white/5 flex items-center justify-between">
              {selected.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  Clear all
                </button>
              )}
              <span className="text-xs text-white/30">
                {filteredOptions.length} option{filteredOptions.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
