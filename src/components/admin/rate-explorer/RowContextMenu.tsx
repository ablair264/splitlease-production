"use client";

import { useEffect, useRef } from "react";
import {
  Check,
  Copy,
  Filter,
  Star,
  Eye,
  EyeOff,
  ImageDown,
  Loader2,
  BarChart3,
} from "lucide-react";
import type { VehicleTableRow } from "./types";

interface RowContextMenuProps {
  x: number;
  y: number;
  vehicle: VehicleTableRow;
  onClose: () => void;
  onFilterByManufacturer: (manufacturer: string) => void;
  onFilterByModel: (model: string) => void;
  onToggleSpecialOffer: () => void;
  onToggleEnabled: () => void;
  onDownloadImages: () => void;
  onViewCompetitors: () => void;
  isDownloading?: boolean;
}

export function RowContextMenu({
  x,
  y,
  vehicle,
  onClose,
  onFilterByManufacturer,
  onFilterByModel,
  onToggleSpecialOffer,
  onToggleEnabled,
  onDownloadImages,
  onViewCompetitors,
  isDownloading = false,
}: RowContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] py-1 rounded-lg shadow-xl"
      style={{
        left: x,
        top: y,
        background: "rgba(26, 31, 42, 0.98)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(8px)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Selection actions */}
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Actions
      </div>

      <button
        onClick={() => copyToClipboard(vehicle.id)}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
      >
        <Copy className="w-4 h-4" />
        <span>Copy ID</span>
        <span className="ml-auto text-[10px] text-white/30 font-mono">{vehicle.id.slice(0, 8)}...</span>
      </button>

      <button
        onClick={() => copyToClipboard(vehicle.capCode)}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
      >
        <Copy className="w-4 h-4" />
        <span>Copy CAP Code</span>
        <span className="ml-auto text-[10px] text-white/30 font-mono">{vehicle.capCode}</span>
      </button>

      <button
        onClick={onViewCompetitors}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-white/5"
      >
        <BarChart3 className="w-4 h-4" />
        <span>View Competitor Prices</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-white/10" />

      {/* Filter actions */}
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Filter
      </div>

      <button
        onClick={() => onFilterByManufacturer(vehicle.manufacturer)}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
      >
        <Filter className="w-4 h-4" />
        <span>Filter by {vehicle.manufacturer}</span>
      </button>

      <button
        onClick={() => onFilterByModel(vehicle.model)}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
      >
        <Filter className="w-4 h-4" />
        <span>Filter by {vehicle.model}</span>
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-white/10" />

      {/* Status actions */}
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Status
      </div>

      <button
        onClick={onToggleSpecialOffer}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5"
      >
        <Star className={`w-4 h-4 ${vehicle.isSpecialOffer ? "fill-amber-400 text-amber-400" : ""}`} />
        <span>{vehicle.isSpecialOffer ? "Remove from Special Offers" : "Mark as Special Offer"}</span>
      </button>

      <button
        onClick={onToggleEnabled}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 ${
          vehicle.isEnabled ? "text-white/70 hover:text-white" : "text-red-400 hover:text-red-300"
        }`}
      >
        {vehicle.isEnabled ? (
          <>
            <EyeOff className="w-4 h-4" />
            <span>Disable on Website</span>
          </>
        ) : (
          <>
            <Eye className="w-4 h-4" />
            <span>Enable on Website</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="my-1 border-t border-white/10" />

      {/* Images section */}
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
        Images
      </div>

      <button
        onClick={onDownloadImages}
        disabled={isDownloading}
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-white/5 ${
          isDownloading
            ? "text-cyan-400 cursor-wait"
            : "text-white/70 hover:text-white"
        }`}
      >
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Downloading...</span>
          </>
        ) : (
          <>
            <ImageDown className="w-4 h-4" />
            <span>Download Images for Vehicle</span>
          </>
        )}
      </button>
    </div>
  );
}
