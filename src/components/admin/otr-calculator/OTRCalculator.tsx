"use client";

import { useReducer } from "react";
import { AdditionalFees } from "./components/AdditionalFees";
import { FinalTotal } from "./components/FinalTotal";
import { OptionsSection } from "./components/OptionsSection";
import { VehiclePrice } from "./components/VehiclePrice";
import { initialState, otrReducer } from "./utils/reducer";
import {
  calculateDiscountedPrice,
  calculateOptionsTotal,
} from "./utils/calculations";

export function OTRCalculator() {
  const [state, dispatch] = useReducer(otrReducer, initialState);

  const discountedVehiclePrice = calculateDiscountedPrice(
    state.vehiclePrice.listPrice,
    state.vehiclePrice.discount
  );
  const factoryOptionsTotal = calculateOptionsTotal(state.factoryOptions);
  const dealerOptionsTotal = calculateOptionsTotal(state.dealerOptions);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold text-white">
          OTR Calculator
        </h1>
        <p className="text-sm text-gray-400">
          Calculate the complete on-the-road price for your vehicle.
        </p>
      </div>

      <VehiclePrice
        listPrice={state.vehiclePrice.listPrice}
        discount={state.vehiclePrice.discount}
        onListPriceChange={(price) =>
          dispatch({ type: "SET_LIST_PRICE", payload: price })
        }
        onDiscountChange={(discount) =>
          dispatch({ type: "SET_VEHICLE_DISCOUNT", payload: discount })
        }
        discountedPrice={discountedVehiclePrice}
      />

      <OptionsSection
        title="Factory Fit Options"
        options={state.factoryOptions}
        vehicleDiscount={state.vehiclePrice.discount}
        onAddOption={() => dispatch({ type: "ADD_FACTORY_OPTION" })}
        onUpdateOption={(id, updates) =>
          dispatch({
            type: "UPDATE_FACTORY_OPTION",
            payload: { id, option: updates },
          })
        }
        onRemoveOption={(id) =>
          dispatch({ type: "REMOVE_FACTORY_OPTION", payload: id })
        }
        onApplyVehicleDiscount={(id) =>
          dispatch({
            type: "APPLY_VEHICLE_DISCOUNT_TO_OPTION",
            payload: { id, isFactory: true },
          })
        }
        total={factoryOptionsTotal}
      />

      <OptionsSection
        title="Dealer Fit Options"
        options={state.dealerOptions}
        vehicleDiscount={state.vehiclePrice.discount}
        onAddOption={() => dispatch({ type: "ADD_DEALER_OPTION" })}
        onUpdateOption={(id, updates) =>
          dispatch({
            type: "UPDATE_DEALER_OPTION",
            payload: { id, option: updates },
          })
        }
        onRemoveOption={(id) =>
          dispatch({ type: "REMOVE_DEALER_OPTION", payload: id })
        }
        onApplyVehicleDiscount={(id) =>
          dispatch({
            type: "APPLY_VEHICLE_DISCOUNT_TO_OPTION",
            payload: { id, isFactory: false },
          })
        }
        total={dealerOptionsTotal}
      />

      <AdditionalFees
        deliveryCharge={state.additionalFees.deliveryCharge}
        co2={state.additionalFees.co2}
        ved={state.additionalFees.ved}
        onDeliveryChargeChange={(charge) =>
          dispatch({ type: "SET_DELIVERY_CHARGE", payload: charge })
        }
        onCO2Change={(co2) => dispatch({ type: "SET_CO2", payload: co2 })}
      />

      <FinalTotal state={state} />
    </div>
  );
}
