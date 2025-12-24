"use client";

import { useState } from "react";
import { X, Star, Loader2 } from "lucide-react";

interface SpecialOfferModalProps {
  vehicleId: string;
  vehicleName: string;
  isSpecialOffer: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
}

export function SpecialOfferModal({
  vehicleId,
  vehicleName,
  isSpecialOffer,
  onClose,
  onConfirm,
}: SpecialOfferModalProps) {
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(notes || undefined);
      onClose();
    } catch (error) {
      console.error("Failed to update special offer status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md mx-4 p-6 rounded-xl shadow-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(26, 31, 42, 0.98) 0%, rgba(20, 25, 32, 0.98) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-white/50 hover:text-white/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: isSpecialOffer
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(251, 191, 36, 0.15)",
            }}
          >
            <Star
              className={`w-7 h-7 ${
                isSpecialOffer ? "text-red-400" : "text-amber-400 fill-amber-400"
              }`}
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white text-center mb-2">
          {isSpecialOffer ? "Remove from Special Offers" : "Mark as Special Offer"}
        </h2>

        {/* Vehicle name */}
        <p className="text-center text-white/60 mb-6">
          {vehicleName}
        </p>

        {/* Notes field (only show when marking as special offer) */}
        {!isSpecialOffer && (
          <div className="mb-6">
            <label className="block text-sm text-white/60 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this special offer..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-white/40
                bg-white/5 border border-white/10
                focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30
                transition-all duration-200 resize-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
              bg-white/5 text-white/70 border border-white/10
              hover:bg-white/10 hover:text-white
              transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200
              ${isSpecialOffer
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Star className={`w-4 h-4 ${!isSpecialOffer ? "fill-amber-400" : ""}`} />
                {isSpecialOffer ? "Remove" : "Confirm"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
