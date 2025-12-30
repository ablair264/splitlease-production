import type { Option, OTRAction, OTRState } from "../types";
import { getVEDFromCO2 } from "./vedRates";

export const initialState: OTRState = {
  vehiclePrice: {
    listPrice: 0,
    discount: { type: "percentage", value: 0 },
  },
  factoryOptions: [],
  dealerOptions: [],
  additionalFees: {
    deliveryCharge: 0,
    co2: 0,
    ved: 0,
  },
};

function createNewOption(): Option {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: "",
    price: 0,
    isPaint: false,
    isPaintFree: false,
    discount: { type: "percentage", value: 0 },
  };
}

export function otrReducer(state: OTRState, action: OTRAction): OTRState {
  switch (action.type) {
    case "SET_LIST_PRICE":
      return {
        ...state,
        vehiclePrice: {
          ...state.vehiclePrice,
          listPrice: action.payload,
        },
      };

    case "SET_VEHICLE_DISCOUNT":
      return {
        ...state,
        vehiclePrice: {
          ...state.vehiclePrice,
          discount: action.payload,
        },
      };

    case "ADD_FACTORY_OPTION":
      return {
        ...state,
        factoryOptions: [...state.factoryOptions, createNewOption()],
      };

    case "ADD_DEALER_OPTION":
      return {
        ...state,
        dealerOptions: [...state.dealerOptions, createNewOption()],
      };

    case "UPDATE_FACTORY_OPTION":
      return {
        ...state,
        factoryOptions: state.factoryOptions.map((option) =>
          option.id === action.payload.id
            ? { ...option, ...action.payload.option }
            : option
        ),
      };

    case "UPDATE_DEALER_OPTION":
      return {
        ...state,
        dealerOptions: state.dealerOptions.map((option) =>
          option.id === action.payload.id
            ? { ...option, ...action.payload.option }
            : option
        ),
      };

    case "REMOVE_FACTORY_OPTION":
      return {
        ...state,
        factoryOptions: state.factoryOptions.filter(
          (option) => option.id !== action.payload
        ),
      };

    case "REMOVE_DEALER_OPTION":
      return {
        ...state,
        dealerOptions: state.dealerOptions.filter(
          (option) => option.id !== action.payload
        ),
      };

    case "APPLY_VEHICLE_DISCOUNT_TO_OPTION": {
      const options = action.payload.isFactory
        ? state.factoryOptions
        : state.dealerOptions;
      
      const updatedOptions = options.map((option) =>
        option.id === action.payload.id
          ? { ...option, discount: { ...state.vehiclePrice.discount } }
          : option
      );

      return {
        ...state,
        ...(action.payload.isFactory
          ? { factoryOptions: updatedOptions }
          : { dealerOptions: updatedOptions }),
      };
    }

    case "SET_DELIVERY_CHARGE":
      return {
        ...state,
        additionalFees: {
          ...state.additionalFees,
          deliveryCharge: action.payload,
        },
      };

    case "SET_CO2": {
      const { rate } = getVEDFromCO2(action.payload);
      return {
        ...state,
        additionalFees: {
          ...state.additionalFees,
          co2: action.payload,
          ved: rate,
        },
      };
    }

    case "SET_VED":
      return {
        ...state,
        additionalFees: {
          ...state.additionalFees,
          ved: action.payload,
        },
      };

    default:
      return state;
  }
}
