import type { Option, VehicleDiscount } from "../types";
import { OptionItem } from "./OptionItem";
import { formatCurrency } from "../utils/calculations";

interface OptionsSectionProps {
  title: string;
  options: Option[];
  vehicleDiscount: VehicleDiscount;
  onAddOption: () => void;
  onUpdateOption: (id: string, updates: Partial<Option>) => void;
  onRemoveOption: (id: string) => void;
  onApplyVehicleDiscount: (id: string) => void;
  total: number;
}

export function OptionsSection({
  title,
  options,
  vehicleDiscount,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onApplyVehicleDiscount,
  total,
}: OptionsSectionProps) {
  return (
    <div className="rounded-lg border border-gray-800/70 bg-[#121821] p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={onAddOption}
          className="flex items-center gap-2 rounded-md bg-[#79d5e9] px-4 py-2 font-medium text-[#0f1419] transition-colors hover:bg-[#9de5f3]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Option
        </button>
      </div>

      {options.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No options added yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {options.map((option) => (
            <OptionItem
              key={option.id}
              option={option}
              vehicleDiscount={vehicleDiscount}
              onUpdate={(updates) => onUpdateOption(option.id, updates)}
              onRemove={() => onRemoveOption(option.id)}
              onApplyVehicleDiscount={() => onApplyVehicleDiscount(option.id)}
            />
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-gray-800/70">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-300">Total {title}:</span>
          <span className="text-lg font-semibold text-white">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
