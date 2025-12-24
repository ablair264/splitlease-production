"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealFilterOptions, DealFilterState } from "./types";

type Option = { label: string; value: string };

const PROVIDER_OPTIONS: Option[] = [
  { value: "lex", label: "Lex" },
  { value: "ogilvie", label: "Ogilvie" },
  { value: "venus", label: "Venus" },
  { value: "drivalia", label: "Drivalia" },
];

function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
      ? options.find((opt) => opt.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm min-w-[160px]",
          "bg-[#1a1f2a] border border-gray-700 text-white",
          "hover:border-gray-600 transition-colors",
          isOpen && "border-[#79d5e9]/50"
        )}
      >
        <span className={selected.length === 0 ? "text-gray-400" : "text-white"}>
          {displayText}
        </span>
        <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-[#1a1f2a] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      selected.includes(option.value)
                        ? "bg-[#79d5e9] border-[#79d5e9]"
                        : "border-gray-600"
                    )}
                  >
                    {selected.includes(option.value) && <Check className="w-3 h-3 text-[#0f1419]" />}
                  </div>
                  {option.label}
                </button>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-700 px-3 py-2">
              <button
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DealFilters({
  filters,
  options,
  onChange,
  isLoading,
}: {
  filters: DealFilterState;
  options?: DealFilterOptions;
  onChange: (next: DealFilterState) => void;
  isLoading: boolean;
}) {
  const [showMore, setShowMore] = useState(false);

  const manufacturerOptions: Option[] =
    options?.manufacturers?.map((item) => ({ value: item, label: item })) ?? [];
  const fuelOptions: Option[] =
    options?.fuelTypes?.map((item) => ({ value: item, label: item })) ?? [];
  const bodyOptions: Option[] =
    options?.bodyStyles?.map((item) => ({ value: item, label: item })) ?? [];

  const update = (patch: Partial<DealFilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#121821] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Search vehicles..."
            className="w-full bg-[#1a1f2a] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#79d5e9]/50"
          />
        </div>

        <MultiSelectDropdown
          options={manufacturerOptions}
          selected={filters.manufacturers}
          onChange={(selected) => update({ manufacturers: selected })}
          placeholder={isLoading ? "Loading..." : "Manufacturer"}
        />

        <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#1a1f2a] p-1">
          <button
            onClick={() => update({ tab: "contract-hire" })}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors",
              filters.tab === "contract-hire"
                ? "bg-[#79d5e9] text-[#0f1419]"
                : "text-gray-400 hover:text-white"
            )}
          >
            CH
          </button>
          <button
            onClick={() => update({ tab: "personal-contract-hire" })}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md transition-colors",
              filters.tab === "personal-contract-hire"
                ? "bg-[#79d5e9] text-[#0f1419]"
                : "text-gray-400 hover:text-white"
            )}
          >
            PCH
          </button>
        </div>

        <button
          onClick={() => update({ withMaintenance: !filters.withMaintenance })}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
            filters.withMaintenance
              ? "border-[#79d5e9]/40 bg-[#79d5e9]/10 text-[#79d5e9]"
              : "border-gray-700 bg-[#1a1f2a] text-gray-400 hover:text-white"
          )}
        >
          Maintenance {filters.withMaintenance ? "On" : "Off"}
        </button>

        <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-[#1a1f2a] px-3 py-2">
          <span className="text-xs uppercase tracking-wide text-gray-400">Score</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.scoreMin}
            onChange={(event) => update({ scoreMin: Number(event.target.value) })}
            className="accent-[#79d5e9]"
          />
          <span className="text-xs font-semibold text-white">{filters.scoreMin}+</span>
        </div>

        <button
          onClick={() => setShowMore((prev) => !prev)}
          className="ml-auto flex items-center gap-2 rounded-lg border border-gray-700 bg-[#1a1f2a] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 hover:text-white"
        >
          <SlidersHorizontal className="h-4 w-4" />
          More filters
        </button>
      </div>

      {showMore && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <MultiSelectDropdown
            options={PROVIDER_OPTIONS}
            selected={filters.providers}
            onChange={(selected) => update({ providers: selected })}
            placeholder="Providers"
          />
          <MultiSelectDropdown
            options={fuelOptions}
            selected={filters.fuelTypes}
            onChange={(selected) => update({ fuelTypes: selected })}
            placeholder="Fuel Type"
          />
          <MultiSelectDropdown
            options={bodyOptions}
            selected={filters.bodyStyles}
            onChange={(selected) => update({ bodyStyles: selected })}
            placeholder="Body Style"
          />
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-[#1a1f2a] px-3 py-2 text-sm text-gray-400">
            <span className="text-xs uppercase tracking-wide text-gray-500">Price</span>
            <input
              type="number"
              min={0}
              value={filters.minPrice ?? ""}
              onChange={(event) => update({ minPrice: event.target.value ? Number(event.target.value) : null })}
              placeholder="Min"
              className="w-20 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            />
            <span className="text-gray-600">-</span>
            <input
              type="number"
              min={0}
              value={filters.maxPrice ?? ""}
              onChange={(event) => update({ maxPrice: event.target.value ? Number(event.target.value) : null })}
              placeholder="Max"
              className="w-20 bg-transparent text-white placeholder-gray-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
