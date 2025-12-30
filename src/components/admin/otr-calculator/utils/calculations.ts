import type { Option, OTRState, VehicleDiscount } from "../types";
import { FIRST_REG_FEE } from "./vedRates";

export function calculateDiscount(price: number, discount: VehicleDiscount): number {
  if (discount.type === "percentage") {
    return price * (discount.value / 100);
  }
  return discount.value;
}

export function calculateDiscountedPrice(price: number, discount: VehicleDiscount): number {
  return price - calculateDiscount(price, discount);
}

export function calculateOptionPrice(option: Option): number {
  // If it's paint and it's free, price is 0
  if (option.isPaint && option.isPaintFree) {
    return 0;
  }
  
  // Otherwise apply discount
  return calculateDiscountedPrice(option.price, option.discount);
}

export function calculateOptionsTotal(options: Option[]): number {
  return options.reduce((total, option) => total + calculateOptionPrice(option), 0);
}

export function calculateSubtotal(state: OTRState): number {
  const vehiclePrice = calculateDiscountedPrice(
    state.vehiclePrice.listPrice,
    state.vehiclePrice.discount
  );
  
  const factoryOptionsTotal = calculateOptionsTotal(state.factoryOptions);
  const dealerOptionsTotal = calculateOptionsTotal(state.dealerOptions);
  
  return vehiclePrice + factoryOptionsTotal + dealerOptionsTotal;
}

export function calculateVAT(subtotal: number): number {
  return subtotal * 0.20;
}

export function calculateTotalIncVAT(state: OTRState): number {
  const subtotal = calculateSubtotal(state);
  return subtotal + calculateVAT(subtotal);
}

export function calculateOTRTotal(state: OTRState): number {
  const totalIncVAT = calculateTotalIncVAT(state);
  return totalIncVAT + state.additionalFees.deliveryCharge + FIRST_REG_FEE + state.additionalFees.ved;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
