import type { OTRState } from "../types";
import {
  calculateSubtotal,
  calculateVAT,
  calculateTotalIncVAT,
  calculateOTRTotal,
  formatCurrency,
} from "../utils/calculations";
import { FIRST_REG_FEE } from "../utils/vedRates";

interface FinalTotalProps {
  state: OTRState;
}

export function FinalTotal({ state }: FinalTotalProps) {
  const subtotal = calculateSubtotal(state);
  const vat = calculateVAT(subtotal);
  const totalIncVAT = calculateTotalIncVAT(state);
  const otrTotal = calculateOTRTotal(state);

  return (
    <div className="rounded-lg border border-[#79d5e9]/30 bg-gradient-to-br from-[#0f1419] via-[#10161f] to-[#121821] p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">Price Breakdown</h2>

      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">Subtotal (Pre-VAT):</span>
          <span className="font-medium text-white">{formatCurrency(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">VAT (20%):</span>
          <span className="font-medium text-white">{formatCurrency(vat)}</span>
        </div>

        <div className="flex justify-between items-center text-sm pt-2 border-t border-[#79d5e9]/20">
          <span className="text-gray-300">Total Inc. VAT:</span>
          <span className="font-semibold text-white">{formatCurrency(totalIncVAT)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">Delivery Charge:</span>
          <span className="font-medium text-white">
            {formatCurrency(state.additionalFees.deliveryCharge)}
          </span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">First Registration Fee:</span>
          <span className="font-medium text-white">{formatCurrency(FIRST_REG_FEE)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">VED:</span>
          <span className="font-medium text-white">
            {formatCurrency(state.additionalFees.ved)}
          </span>
        </div>
      </div>

      <div className="pt-4 border-t border-[#79d5e9]/30">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-white">On The Road Price:</span>
          <span className="text-2xl font-bold text-[#79d5e9]">
            {formatCurrency(otrTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
