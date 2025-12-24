"use client";

import { Star } from "lucide-react";

interface StarCellProps {
  isSpecialOffer: boolean;
  onClick?: () => void;
}

export function StarCell({ isSpecialOffer, onClick }: StarCellProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`
        p-1 rounded transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50
        ${isSpecialOffer
          ? "text-amber-400 hover:text-amber-300"
          : "text-white/20 hover:text-white/40"
        }
      `}
      title={isSpecialOffer ? "Remove from Special Offers" : "Mark as Special Offer"}
      aria-label={isSpecialOffer ? "Remove from special offers" : "Mark as special offer"}
    >
      <Star
        className={`w-4 h-4 transition-all ${isSpecialOffer ? "fill-amber-400" : ""}`}
      />
    </button>
  );
}
