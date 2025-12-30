export type DiscountType = "percentage" | "fixed";

export interface VehicleDiscount {
  type: DiscountType;
  value: number;
}

export interface Option {
  id: string;
  name: string;
  price: number;
  isPaint: boolean;
  isPaintFree: boolean;
  discount: VehicleDiscount;
}

export interface VehiclePrice {
  listPrice: number;
  discount: VehicleDiscount;
}

export interface AdditionalFees {
  deliveryCharge: number;
  co2: number;
  ved: number;
}

export interface OTRState {
  vehiclePrice: VehiclePrice;
  factoryOptions: Option[];
  dealerOptions: Option[];
  additionalFees: AdditionalFees;
}

export type OTRAction =
  | { type: "SET_LIST_PRICE"; payload: number }
  | { type: "SET_VEHICLE_DISCOUNT"; payload: VehicleDiscount }
  | { type: "ADD_FACTORY_OPTION" }
  | { type: "ADD_DEALER_OPTION" }
  | { type: "UPDATE_FACTORY_OPTION"; payload: { id: string; option: Partial<Option> } }
  | { type: "UPDATE_DEALER_OPTION"; payload: { id: string; option: Partial<Option> } }
  | { type: "REMOVE_FACTORY_OPTION"; payload: string }
  | { type: "REMOVE_DEALER_OPTION"; payload: string }
  | { type: "APPLY_VEHICLE_DISCOUNT_TO_OPTION"; payload: { id: string; isFactory: boolean } }
  | { type: "SET_DELIVERY_CHARGE"; payload: number }
  | { type: "SET_CO2"; payload: number }
  | { type: "SET_VED"; payload: number };
