import { formatCurrency } from "../utils/calculations";
import { FIRST_REG_FEE, getVEDFromCO2 } from "../utils/vedRates";

interface AdditionalFeesProps {
  deliveryCharge: number;
  co2: number;
  ved: number;
  onDeliveryChargeChange: (charge: number) => void;
  onCO2Change: (co2: number) => void;
}

export function AdditionalFees({
  deliveryCharge,
  co2,
  ved,
  onDeliveryChargeChange,
  onCO2Change,
}: AdditionalFeesProps) {
  const { band } = getVEDFromCO2(co2);

  return (
    <div className="rounded-lg border border-gray-800/70 bg-[#121821] p-6 space-y-4">
      <h2 className="text-xl font-semibold text-white">Additional Fees</h2>

      <div>
        <label htmlFor="deliveryCharge" className="block text-sm font-medium text-gray-300 mb-1">
          Delivery Charge
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
            £
          </span>
          <input
            type="number"
            id="deliveryCharge"
            value={deliveryCharge || ""}
            onChange={(e) => onDeliveryChargeChange(parseFloat(e.target.value) || 0)}
            className="block w-full rounded-md border border-gray-800 bg-[#0f1419] pl-7 pr-3 py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40"
            placeholder="0.00"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label htmlFor="co2" className="block text-sm font-medium text-gray-300 mb-1">
          CO₂ Emissions (g/km)
        </label>
        <input
          type="number"
          id="co2"
          value={co2 || ""}
          onChange={(e) => onCO2Change(parseFloat(e.target.value) || 0)}
          className="block w-full rounded-md border border-gray-800 bg-[#0f1419] px-3 py-2 text-white placeholder:text-gray-600 focus:border-[#79d5e9] focus:ring-2 focus:ring-[#79d5e9]/40"
          placeholder="0"
          step="1"
        />
        {band && co2 > 0 && (
          <p className="mt-1 text-sm text-gray-400">
            VED Band: <span className="font-medium text-gray-200">{band.label}</span>
          </p>
        )}
      </div>

      <div className="space-y-2 pt-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">First Registration Fee:</span>
          <span className="font-medium text-white">{formatCurrency(FIRST_REG_FEE)}</span>
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-300">Vehicle Excise Duty (VED):</span>
          <span className="font-medium text-white">{formatCurrency(ved)}</span>
        </div>
      </div>
    </div>
  );
}
