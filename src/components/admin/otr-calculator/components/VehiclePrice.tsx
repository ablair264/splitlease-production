import type { VehicleDiscount } from "../types";
import { formatCurrency } from "../utils/calculations";

interface VehiclePriceProps {
  listPrice: number;
  discount: VehicleDiscount;
  onListPriceChange: (price: number) => void;
  onDiscountChange: (discount: VehicleDiscount) => void;
  discountedPrice: number;
}

export function VehiclePrice({
  listPrice,
  discount,
  onListPriceChange,
  onDiscountChange,
  discountedPrice,
}: VehiclePriceProps) {
  return (
    <div className="rounded-lg border border-gray-800/70 bg-[#121821] p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">Base Vehicle Price</h2>
      
      <div>
        <label htmlFor="listPrice" className="block text-sm font-medium text-gray-300 mb-1">
          Basic List Price
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
            £
          </span>
          <input
            type="number"
            id="listPrice"
            value={listPrice || ""}
            onChange={(e) => onListPriceChange(parseFloat(e.target.value) || 0)}
            className="block w-full rounded-md border border-gray-800 bg-[#0f1419] pl-7 pr-3 py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Discount
        </label>
        
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDiscountChange({ ...discount, type: "percentage" })}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              discount.type === "percentage"
                ? "bg-[#79d5e9] text-[#0f1419]"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => onDiscountChange({ ...discount, type: "fixed" })}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              discount.type === "fixed"
                ? "bg-[#79d5e9] text-[#0f1419]"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            £
          </button>
        </div>

        <div className="relative">
          {discount.type === "fixed" && (
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              £
            </span>
          )}
          <input
            type="number"
            value={discount.value || ""}
            onChange={(e) =>
              onDiscountChange({ ...discount, value: parseFloat(e.target.value) || 0 })
            }
            className={`block w-full rounded-md border border-gray-800 bg-[#0f1419] py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40 ${
              discount.type === "fixed" ? "pl-7 pr-3" : "pl-3 pr-10"
            }`}
            placeholder="0"
            step={discount.type === "percentage" ? "0.1" : "0.01"}
          />
          {discount.type === "percentage" && (
            <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
              %
            </span>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-800/70">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-300">Discounted Price:</span>
          <span className="text-lg font-semibold text-white">
            {formatCurrency(discountedPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
