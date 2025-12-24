"use client";

import React, { useMemo, useState } from "react";
import { X, Check, ArrowRight, Mail, Phone as PhoneIcon, User, MessageSquare } from "lucide-react";
import { generateReference } from "@/lib/reference";

const colors = {
  dark: "#0f1419",
  mid: "#1a1f2a",
  card: "#1f2633",
  accent: "#79d5e9",
  accentAlt: "#00e7dc",
};

export interface EnquiryModalProps {
  open: boolean;
  onClose: () => void;
  vehicleTitle: string;
  vehicleImage?: string;
  contractSummary?: string;
}

type Step = "choice" | "form" | "success" | "finance";

type FormData = {
  name: string;
  phone: string;
  email: string;
  comment: string;
};

export default function EnquiryModal({ open, onClose, vehicleTitle, vehicleImage, contractSummary }: EnquiryModalProps) {
  const [step, setStep] = useState<Step>("choice");
  const [form, setForm] = useState<FormData>({ name: "", phone: "", email: "", comment: "" });
  const [ref, setRef] = useState<string | null>(null);

  const progressIndex = useMemo(() => {
    switch (step) {
      case "choice":
        return 1;
      case "form":
      case "finance":
        return 2;
      case "success":
        return 3;
      default:
        return 1;
    }
  }, [step]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reference = generateReference();
    setRef(reference);
    setStep("success");
  };

  const resetFlow = () => {
    setStep("choice");
    setRef(null);
    setForm({ name: "", phone: "", email: "", comment: "" });
  };

  const closeAndReset = () => {
    resetFlow();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeAndReset} />
      <div
        className="relative w-[95vw] max-w-4xl overflow-hidden rounded-2xl border border-white/10"
        style={{ backgroundColor: colors.mid, boxShadow: "0 20px 80px rgba(0,0,0,0.55)" }}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Enquiry</p>
            <h2 className="text-lg font-bold text-white">Confirm your choice</h2>
          </div>
          <button
            onClick={closeAndReset}
            className="rounded-full bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white/60">
          {[1, 2, 3].map((n) => (
            <React.Fragment key={n}>
              <div
                className="h-1 flex-1 rounded-full"
                style={{ backgroundColor: n <= progressIndex ? colors.accent : "rgba(255,255,255,0.08)" }}
              />
              {n !== 3 && <div className="w-2" />}
            </React.Fragment>
          ))}
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr,1fr]">
          {/* Summary */}
          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Your selection</p>
            <h3 className="mt-2 text-xl font-bold text-white">{vehicleTitle}</h3>
            {vehicleImage && (
              <div className="mt-4 overflow-hidden rounded-lg border border-white/5 bg-[#0f1419]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={vehicleImage} alt={vehicleTitle} className="h-40 w-full object-cover" />
              </div>
            )}
            {contractSummary && (
              <p className="mt-3 text-sm text-white/70">{contractSummary}</p>
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {step === "choice" && (
              <div className="flex flex-col gap-4">
                <button
                  className="flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10"
                  onClick={() => setStep("form")}
                >
                  <div className="flex items-center gap-2 text-white">
                    <Mail size={16} />
                    <span className="text-sm font-semibold">I’d like more information</span>
                  </div>
                  <p className="text-sm text-white/70">
                    Submit your enquiry and a member of the team will be in touch within 24 hours
                    (Monday - Friday 09:00 - 17:30) to discuss this with you and answer any questions.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    Continue <ArrowRight size={14} />
                  </div>
                </button>

                <button
                  className="flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10"
                  onClick={() => setStep("finance")}
                >
                  <div className="flex items-center gap-2 text-white">
                    <Check size={16} />
                    <span className="text-sm font-semibold">I’m happy to apply now</span>
                  </div>
                  <p className="text-sm text-white/70">
                    Fill out our online Finance Application and we will review and be in touch if we require
                    any further information from you.
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    Continue <ArrowRight size={14} />
                  </div>
                </button>
              </div>
            )}

            {step === "form" && (
              <form className="flex flex-col gap-3" onSubmit={handleFormSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-sm text-white/70">
                    Name
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus-within:border-white/30">
                      <User size={16} className="text-white/50" />
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                        placeholder="Full name"
                      />
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-sm text-white/70">
                    Phone
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus-within:border-white/30">
                      <PhoneIcon size={16} className="text-white/50" />
                      <input
                        required
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                        placeholder="Phone number"
                      />
                    </div>
                  </label>
                </div>
                <label className="flex flex-col gap-1 text-sm text-white/70">
                  Email
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus-within:border-white/30">
                    <Mail size={16} className="text-white/50" />
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                      placeholder="email@example.com"
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm text-white/70">
                  Comment
                  <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus-within:border-white/30">
                    <MessageSquare size={16} className="mt-1 text-white/50" />
                    <textarea
                      value={form.comment}
                      onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                      rows={3}
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                      placeholder="Let us know any specifics you’re interested in"
                    />
                  </div>
                </label>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("choice")}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg px-5 py-2 text-sm font-semibold text-[#0b1a1f] transition"
                    style={{ backgroundColor: colors.accent, boxShadow: "0 10px 30px rgba(121,213,233,0.25)" }}
                  >
                    Submit enquiry
                  </button>
                </div>
              </form>
            )}

            {step === "success" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgba(0,231,220,0.15)] px-3 py-1 text-xs font-semibold" style={{ color: colors.accentAlt }}>
                  <Check size={14} /> Enquiry sent
                </div>
                <h3 className="text-xl font-bold">Thanks for your enquiry</h3>
                <p className="mt-2 text-sm text-white/70">
                  We’ve received your details and will be in touch within 24 hours (Mon-Fri 09:00-17:30).
                </p>
                <p className="mt-3 text-sm font-semibold" style={{ color: colors.accent }}>
                  Reference: {ref}
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={closeAndReset}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setStep("choice")}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-[#0b1a1f] transition"
                    style={{ backgroundColor: colors.accent }}
                  >
                    New enquiry
                  </button>
                </div>
              </div>
            )}

            {step === "finance" && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                  Coming soon
                </div>
                <h3 className="text-xl font-bold">Online Finance Application</h3>
                <p className="mt-2 text-sm text-white/70">
                  We’re building a streamlined finance application experience. Leave this window open and we’ll
                  add the application form here soon.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setStep("choice")}
                    className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                  >
                    Back
                  </button>
                  <button
                    onClick={closeAndReset}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-[#0b1a1f] transition"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
