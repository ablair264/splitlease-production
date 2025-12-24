"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Code, Terminal } from "lucide-react";

const AUTOMATION_SCRIPT = `// Lex Autolease Quote Automation Script
// Run this in the browser console while logged into associate.lexautolease.co.uk

class LexAutoQuoteAutomation {
  constructor() {
    this.csrf_token = window.csrf_token;
    this.profile = window.profile;
    this.baseUrl = 'https://associate.lexautolease.co.uk';
  }

  async callService(serviceName, functionName, data) {
    const url = \`\${this.baseUrl}/services/\${serviceName}.svc/\${functionName}\`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'x-csrf-check': this.csrf_token
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API Error');
    return await response.json();
  }

  async getVariantDetails(makeId, modelId, variantId) {
    return await this.callService('Quote', 'GetVariant', {
      manufacturerId: makeId, modelId, variantId
    });
  }

  async getContractTypes(paymentPlanId = '', specialOfferId = 0) {
    return await this.callService('Quote', 'GetContractTypes', {
      paymentPlanId, specialOfferId
    });
  }

  buildQuoteLine({ makeId, modelId, variantId, term, mileage, contractTypeId }) {
    return {
      LineNo: 0, Term: term.toString(), Mileage: mileage.toString(),
      TotalMileage: (parseInt(term) * parseInt(mileage)).toString(),
      BrokerOTRP: "", Commission: this.profile.SalesCode || "000000000",
      ContractTypeId: contractTypeId.toString(), BonusExcluded: false,
      OffInvSupport: "", DealerDiscount: this.profile.Discount || "-1",
      ModelId: modelId.toString(), VariantId: variantId.toString(),
      ManufacturerId: makeId.toString(),
      SpecialOfferDetail: { OfferId: 0, SpecialOfferTypeId: 0, TrimColourId: 0 },
      OptionalExtras: [], Deposit: "-1", EstimatedSaleValue: "-1",
      InitialPayment: "-1", FRFExcluded: false, RegulatedAgreementOnly: false
    };
  }

  async calculateQuote(quoteLine, paymentPlanId = '') {
    const calcRequest = {
      RVCode: this.profile.RVCode || "00", PaymentPlanId: paymentPlanId,
      CustomerRef: "", IsRentalRollback: false, TargetRental: 0,
      RollbackField: "", ActiveLine: quoteLine, IsSpecialOfferVehicle: false,
      AnticipatedDeliveryDate: null, WLTPCo2: "", SelectedLineNo: 0,
      IsWLTPCo2: false, PartnerId: "",
      GenerateQuoteNumber: this.profile.Role === "LBS"
    };
    return await this.callService('Quote', 'CalculateQuote', { calcrequest: calcRequest });
  }

  async getQuote() {
    return await this.callService('Quote', 'GetQuote', {});
  }

  async runQuote({ makeId, modelId, variantId, term, mileage }) {
    try {
      const contractTypes = await this.getContractTypes();
      const contractTypeId = contractTypes[0].Key;
      const quoteLine = this.buildQuoteLine({
        makeId, modelId, variantId, term, mileage, contractTypeId
      });
      const result = await this.calculateQuote(quoteLine);
      if (result.Success) {
        const quoteDetails = await this.getQuote();
        const variant = quoteDetails.Variants[0];
        return {
          success: true, quoteId: result.QuoteId,
          monthlyRental: variant.MonthlyRental,
          initialRental: variant.InitialRental,
          co2: variant.CO2, p11d: variant.P11D
        };
      }
      return { success: false, error: 'Quote calculation failed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

window.LexAutomation = new LexAutoQuoteAutomation();
console.log('✅ Lex Automation loaded! Use window.LexAutomation.runQuote({...})');`;

export function AutomationGuide() {
  const [copied, setCopied] = useState(false);

  const copyScript = async () => {
    await navigator.clipboard.writeText(AUTOMATION_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)"
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Terminal className="h-5 w-5 text-[#79d5e9]" />
          How It Works
        </h3>
        <p className="text-white/60 text-sm leading-relaxed mb-4">
          The Lex Autolease quote automation runs directly in your browser while logged into
          the Lex Autolease Associate Portal. This is required because the API uses
          session-based authentication that cannot be accessed externally.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#79d5e9] text-xs font-bold">1</span>
            </div>
            <p className="text-white/80 text-sm">
              Log into <a
                href="https://associate.lexautolease.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#79d5e9] hover:underline inline-flex items-center gap-1"
              >
                Lex Autolease Associate Portal
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#79d5e9] text-xs font-bold">2</span>
            </div>
            <p className="text-white/80 text-sm">
              Open browser Developer Tools (F12) and go to the Console tab
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#79d5e9] text-xs font-bold">3</span>
            </div>
            <p className="text-white/80 text-sm">
              Paste the automation script below and press Enter
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#79d5e9]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[#79d5e9] text-xs font-bold">4</span>
            </div>
            <p className="text-white/80 text-sm">
              Run quotes using the provided commands
            </p>
          </div>
        </div>
      </div>

      {/* Script */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)"
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
        >
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-[#79d5e9]" />
            <span className="text-white font-medium text-sm">Automation Script</span>
          </div>
          <button
            onClick={copyScript}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: copied ? "rgba(34, 197, 94, 0.2)" : "rgba(121, 213, 233, 0.15)",
              color: copied ? "#22c55e" : "#79d5e9"
            }}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Script
              </>
            )}
          </button>
        </div>
        <pre
          className="p-4 text-xs text-white/70 overflow-x-auto max-h-80"
          style={{ background: "rgba(0, 0, 0, 0.3)" }}
        >
          {AUTOMATION_SCRIPT}
        </pre>
      </div>

      {/* Usage Example */}
      <div
        className="p-6 rounded-xl border"
        style={{
          background: "rgba(26, 31, 42, 0.6)",
          borderColor: "rgba(255, 255, 255, 0.1)"
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Usage Example</h3>
        <pre
          className="p-4 rounded-lg text-xs text-green-400 overflow-x-auto"
          style={{ background: "rgba(0, 0, 0, 0.4)" }}
        >
{`// Run a single quote
const result = await window.LexAutomation.runQuote({
  makeId: "75",      // Manufacturer ID
  modelId: "1",      // Model ID
  variantId: "19",   // Variant ID
  term: "36",        // Contract term in months
  mileage: "10000"   // Annual mileage
});

console.log(result);
// { success: true, monthlyRental: 450.00, initialRental: 450.00, ... }`}
        </pre>
      </div>
    </div>
  );
}
