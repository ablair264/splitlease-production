"use client";

import { useState } from "react";
import Image from "next/image";
import { Car } from "lucide-react";

interface LogoCellProps {
  logoUrl: string;
  manufacturer: string;
}

export function LogoCell({ logoUrl, manufacturer }: LogoCellProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className="w-8 h-8 rounded flex items-center justify-center"
        style={{ background: "rgba(121, 213, 233, 0.1)" }}
        title={manufacturer}
      >
        <Car className="w-4 h-4 text-cyan-400/60" />
      </div>
    );
  }

  return (
    <div
      className="w-8 h-8 rounded overflow-hidden flex items-center justify-center bg-white"
    >
      <Image
        src={logoUrl}
        alt={`${manufacturer} logo`}
        width={28}
        height={28}
        className="object-contain"
        style={{ width: "auto", height: "auto", maxWidth: 28, maxHeight: 28 }}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
