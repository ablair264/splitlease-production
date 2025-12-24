"use client";

interface RangeFilterProps {
  label: string;
  minValue: number | null;
  maxValue: number | null;
  minLimit?: number;
  maxLimit?: number;
  onChange: (min: number | null, max: number | null) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  compact?: boolean;
}

export function RangeFilter({
  label,
  minValue,
  maxValue,
  minLimit = 0,
  maxLimit = 100000,
  onChange,
  prefix = "",
  suffix = "",
  step = 1,
  compact = false,
}: RangeFilterProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : parseFloat(e.target.value);
    onChange(val, maxValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === "" ? null : parseFloat(e.target.value);
    onChange(minValue, val);
  };

  const handleClear = () => {
    onChange(null, null);
  };

  const hasValue = minValue !== null || maxValue !== null;

  const inputClasses = `
    w-full py-1.5 rounded-lg text-sm text-white placeholder-white/30
    outline-none transition-all focus:ring-2 focus:ring-cyan-500/30
    ${prefix ? "pl-5 pr-2" : "px-2.5"}
    ${suffix ? "pr-12" : ""}
  `;

  const inputStyle = {
    background: "rgba(15, 20, 25, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs text-white/40 font-medium uppercase tracking-wider whitespace-nowrap">
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <div className="relative">
            {prefix && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/40">
                {prefix}
              </span>
            )}
            <input
              type="number"
              value={minValue ?? ""}
              onChange={handleMinChange}
              placeholder="Min"
              min={minLimit}
              max={maxLimit}
              step={step}
              className={`${inputClasses} w-20`}
              style={inputStyle}
            />
          </div>
          <span className="text-white/30 text-xs">–</span>
          <div className="relative">
            {prefix && (
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-white/40">
                {prefix}
              </span>
            )}
            <input
              type="number"
              value={maxValue ?? ""}
              onChange={handleMaxChange}
              placeholder="Max"
              min={minLimit}
              max={maxLimit}
              step={step}
              className={`${inputClasses} w-20`}
              style={inputStyle}
            />
          </div>
          {hasValue && (
            <button
              onClick={handleClear}
              className="text-white/40 hover:text-white/60 transition-colors p-1"
              aria-label="Clear range"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-white/50 font-medium">{label}</label>
        {hasValue && (
          <button
            onClick={handleClear}
            className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">
              {prefix}
            </span>
          )}
          <input
            type="number"
            value={minValue ?? ""}
            onChange={handleMinChange}
            placeholder="Min"
            min={minLimit}
            max={maxLimit}
            step={step}
            className={inputClasses}
            style={inputStyle}
          />
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">
              {suffix}
            </span>
          )}
        </div>
        <span className="text-white/30 text-xs">–</span>
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">
              {prefix}
            </span>
          )}
          <input
            type="number"
            value={maxValue ?? ""}
            onChange={handleMaxChange}
            placeholder="Max"
            min={minLimit}
            max={maxLimit}
            step={step}
            className={inputClasses}
            style={inputStyle}
          />
          {suffix && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40">
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
