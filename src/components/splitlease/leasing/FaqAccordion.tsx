"use client";

import { useState } from "react";

import type { FaqItem } from "./content";

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.question}
            className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
              isOpen
                ? "border-[#79d5e9]/50 bg-[#1a1f2a]"
                : "border-white/10 bg-[#0f1419]"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span
                className={`text-base font-semibold transition-colors ${
                  isOpen ? "text-[#79d5e9]" : "text-white"
                }`}
              >
                {item.question}
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-all ${
                  isOpen
                    ? "border-[#79d5e9]/40 text-[#79d5e9]"
                    : "border-white/10 text-white/70"
                }`}
              >
                {isOpen ? "-" : "+"}
              </span>
            </button>
            <div
              className={`px-6 pb-6 text-sm leading-relaxed text-gray-400 transition-all ${
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
