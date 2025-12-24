"use client";

interface ChipSelectProps {
  label: string;
  options: number[];
  selected: number[];
  onChange: (selected: number[]) => void;
  formatLabel?: (value: number) => string;
  compact?: boolean;
}

export function ChipSelect({
  label,
  options,
  selected,
  onChange,
  formatLabel = (v) => String(v),
  compact = false,
}: ChipSelectProps) {
  const toggleOption = (option: number) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);
  const allSelected = options.length > 0 && options.every(o => selected.includes(o));

  return (
    <div className={compact ? "flex items-center gap-3" : ""}>
      <div className={compact ? "flex items-center gap-2" : "flex items-center justify-between mb-2"}>
        <label className={`text-xs font-medium ${compact ? "text-white/40 uppercase tracking-wider" : "text-white/50"}`}>
          {label}
        </label>
        {!compact && selected.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              onClick={() => toggleOption(option)}
              className={`
                ${compact ? "px-2.5 py-1" : "px-3 py-1.5"}
                rounded-md text-xs font-medium transition-all duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
                ${isSelected
                  ? "text-white shadow-sm"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }
              `}
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #1e8d8d 0%, #1a7a7a 100%)"
                  : "rgba(15, 20, 25, 0.5)",
                border: `1px solid ${isSelected ? "rgba(30, 141, 141, 0.5)" : "rgba(255, 255, 255, 0.06)"}`,
              }}
              aria-pressed={isSelected}
            >
              {formatLabel(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
