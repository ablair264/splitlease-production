import type { Option, VehicleDiscount } from "../types";
import { calculateOptionPrice, formatCurrency } from "../utils/calculations";

interface OptionItemProps {
  option: Option;
  vehicleDiscount: VehicleDiscount;
  onUpdate: (updates: Partial<Option>) => void;
  onRemove: () => void;
  onApplyVehicleDiscount: () => void;
}

export function OptionItem({
  option,
  vehicleDiscount,
  onUpdate,
  onRemove,
  onApplyVehicleDiscount,
}: OptionItemProps) {
  const finalPrice = calculateOptionPrice(option);

  return (
    <div className="rounded-lg border border-gray-800/70 bg-[#0f1419] p-4 space-y-4">
      <div className="flex justify-between items-start gap-2">
        <input
          type="text"
          value={option.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Option name"
          className="flex-1 rounded-md border border-gray-800 bg-[#0b1016] px-3 py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40"
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-2 text-red-400 hover:bg-red-500/10 transition-colors"
          title="Remove option"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Price
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
            £
          </span>
          <input
            type="number"
            value={option.price || ""}
            onChange={(e) => onUpdate({ price: parseFloat(e.target.value) || 0 })}
            className="block w-full rounded-md border border-gray-800 bg-[#0b1016] pl-7 pr-3 py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={option.isPaint}
            onChange={(e) =>
              onUpdate({ isPaint: e.target.checked, isPaintFree: false })
            }
            className="rounded border-gray-700 bg-[#0b1016] text-[#79d5e9] focus:ring-[#79d5e9]"
          />
          <span className="text-sm font-medium text-gray-300">Is this a paint option?</span>
        </label>

        {option.isPaint && (
          <label className="flex items-center gap-2 ml-6">
            <input
              type="checkbox"
              checked={option.isPaintFree}
              onChange={(e) => onUpdate({ isPaintFree: e.target.checked })}
              className="rounded border-gray-700 bg-[#0b1016] text-[#79d5e9] focus:ring-[#79d5e9]"
            />
            <span className="text-sm text-gray-400">Paint is free (100% discount)</span>
          </label>
        )}
      </div>

      {(!option.isPaint || !option.isPaintFree) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-300">
              Discount
            </label>
            <button
              type="button"
              onClick={onApplyVehicleDiscount}
              className="text-xs text-[#79d5e9] hover:text-[#9de5f3] font-medium"
            >
              Apply vehicle discount ({vehicleDiscount.type === "percentage" ? `${vehicleDiscount.value}%` : formatCurrency(vehicleDiscount.value)})
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdate({ discount: { ...option.discount, type: "percentage" } })
              }
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                option.discount.type === "percentage"
                  ? "bg-[#79d5e9] text-[#0f1419]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdate({ discount: { ...option.discount, type: "fixed" } })
              }
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                option.discount.type === "fixed"
                  ? "bg-[#79d5e9] text-[#0f1419]"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              £
            </button>
          </div>

          <div className="relative">
            {option.discount.type === "fixed" && (
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                £
              </span>
            )}
            <input
              type="number"
              value={option.discount.value || ""}
              onChange={(e) =>
                onUpdate({
                  discount: { ...option.discount, value: parseFloat(e.target.value) || 0 },
                })
              }
              className={`block w-full rounded-md border border-gray-800 bg-[#0b1016] py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40 ${
                option.discount.type === "fixed" ? "pl-7 pr-3" : "pl-3 pr-10"
              }`}
              placeholder="0"
              step={option.discount.type === "percentage" ? "0.1" : "0.01"}
            />
            {option.discount.type === "percentage" && (
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                %
              </span>
            )}
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-gray-800/70">
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium text-gray-300">Final Price:</span>
          <span className="font-semibold text-white">
            {formatCurrency(finalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
