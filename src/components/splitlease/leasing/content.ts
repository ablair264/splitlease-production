export type GuideSection = {
  id: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type FeatureItem = {
  title: string;
  description: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const personalGuide = {
  hero: {
    badge: "Personal leasing",
    title: "Personal Leasing Guide",
    subtitle:
      "A plain-English guide to personal contract hire, how pricing is set, and what you can expect during the lease.",
    primaryCta: { label: "Browse personal deals", href: "/cars" },
    secondaryCta: { label: "See FAQs", href: "/faqs" },
  },
  quickFacts: [
    { label: "Typical term", value: "24 to 48 months" },
    { label: "Ownership", value: "No - return the car" },
    { label: "Payments", value: "Fixed monthly rentals" },
    { label: "Mileage", value: "Agreed in advance" },
  ],
  sections: [
    {
      id: "what-is-personal-leasing",
      eyebrow: "The basics",
      title: "What is personal car leasing?",
      paragraphs: [
        "Personal car leasing, often called Personal Contract Hire (PCH), is a long-term rental agreement. You choose your car, contract length, and mileage, then pay an initial rental followed by fixed monthly payments.",
        "You do not own the vehicle. At the end of the agreement, you hand the car back and can move into a new lease without worrying about selling or depreciation.",
      ],
    },
    {
      id: "how-pricing-works",
      eyebrow: "How it works",
      title: "How pricing is set",
      paragraphs: [
        "A finance provider buys and owns the vehicle, and you lease it for a fixed term. Monthly cost is based on the vehicle value and how much of that value is used during the agreement.",
        "These are the main factors that shape your monthly rental:",
      ],
      bullets: [
        "Vehicle value (often shown as the P11D list price)",
        "Estimated value at the end of the lease (residual value)",
        "Annual mileage allowance",
        "Contract length",
        "Initial rental amount (higher upfront usually lowers monthly cost)",
        "Optional maintenance and servicing packages",
      ],
    },
    {
      id: "cost-effective",
      eyebrow: "Value",
      title: "Why personal leasing can be cost-effective",
      paragraphs: [
        "Leasing avoids the biggest cost of ownership: depreciation. New cars can lose a large portion of value in their first few years, and leasing means you are not left holding that loss.",
        "You also benefit from manufacturer warranty cover during the lease term, with optional maintenance packages available to smooth out service and repair costs.",
        "For many drivers, leasing is the simplest route into a modern, efficient vehicle, including newer electric models.",
      ],
    },
  ] as GuideSection[],
  benefits: [
    {
      title: "Drive a brand-new car",
      description:
        "Leasing makes newer models and modern safety features more accessible without a large purchase price.",
    },
    {
      title: "Upgrade every few years",
      description:
        "Contracts typically run 2 to 5 years, letting you refresh your car regularly.",
    },
    {
      title: "Avoid ageing-car costs",
      description:
        "You skip the higher maintenance and repair bills that often arrive as vehicles get older.",
    },
    {
      title: "Lower upfront cost",
      description:
        "Initial rentals are usually smaller than deposits for purchasing or other finance options.",
    },
    {
      title: "Predictable budgeting",
      description:
        "Fixed monthly payments help you plan with confidence, with optional maintenance for added certainty.",
    },
    {
      title: "No resale hassle",
      description:
        "Hand the car back at the end of the lease - no selling, part exchange, or negotiating.",
    },
  ] as FeatureItem[],
  included: [
    {
      title: "Manufacturer warranty",
      description:
        "New lease cars are covered by the manufacturer warranty for peace of mind during your term.",
    },
    {
      title: "Breakdown cover",
      description:
        "Most vehicles include manufacturer-backed breakdown assistance for the lease period.",
    },
    {
      title: "Road tax",
      description:
        "Road tax is usually included in your rental for the full lease period.",
    },
    {
      title: "MOT support",
      description:
        "If your lease extends beyond three years, MOT costs are often covered with a maintenance plan.",
    },
  ] as FeatureItem[],
  eligibility: {
    title: "Who can apply?",
    paragraphs: [
      "Eligibility is based on your ability to make the monthly payments. A credit check is part of the application, and lenders typically ask for evidence of stability and income.",
    ],
    bullets: [
      "Full UK driving licence",
      "Three years of address history",
      "Three years of employment or education history",
      "Regular, provable income",
      "Successful credit assessment",
    ],
  },
};

export const businessGuide = {
  hero: {
    badge: "Business leasing",
    title: "Business Leasing Guide",
    subtitle:
      "Understand business leasing options, key benefits, and the differences between contract hire, contract purchase, and finance lease.",
    primaryCta: { label: "Browse business deals", href: "/cars" },
    secondaryCta: { label: "Speak to our team", href: "/contact" },
  },
  quickFacts: [
    { label: "Popular option", value: "Business Contract Hire" },
    { label: "Typical term", value: "24 to 60 months" },
    { label: "VAT treatment", value: "Often reclaimable" },
    { label: "End of term", value: "Return, buy, or sell" },
  ],
  sections: [
    {
      id: "business-explained",
      eyebrow: "Overview",
      title: "Business car leasing explained",
      paragraphs: [
        "Business leasing lets companies use vehicles without buying them outright. You pay fixed rentals for an agreed term, with contracts tailored around mileage and budget.",
        "It is widely used by limited companies, sole traders, and fleets because it keeps cash flow predictable and can deliver tax efficiencies.",
      ],
    },
    {
      id: "business-eligibility",
      eyebrow: "Eligibility",
      title: "Who can apply?",
      paragraphs: [
        "Most trading businesses can apply for a business lease, subject to underwriting checks and financial status.",
      ],
      bullets: [
        "Limited companies (LTD, PLC)",
        "Limited liability partnerships (LLP)",
        "Sole traders and self-employed professionals",
        "Charities and public sector organisations",
      ],
    },
  ] as GuideSection[],
  benefits: [
    {
      title: "Stronger brand image",
      description:
        "Affordable access to newer vehicles helps project a professional impression to customers.",
    },
    {
      title: "Safety and compliance",
      description:
        "Regularly updated vehicles support duty-of-care responsibilities for staff who drive for work.",
    },
    {
      title: "Staff attraction",
      description:
        "Company cars remain a valued employee benefit and can support retention.",
    },
    {
      title: "Flexible fleet use",
      description:
        "Contract terms can be tailored to individual drivers or shared teams.",
    },
    {
      title: "Predictable cash flow",
      description:
        "Fixed rentals support budgeting and reduce the risk of unexpected vehicle costs.",
    },
    {
      title: "No resale burden",
      description:
        "Hand vehicles back at end of term instead of managing disposal or resale.",
    },
  ] as FeatureItem[],
  leaseTypes: [
    {
      title: "Business Contract Hire (BCH)",
      description:
        "The most common business lease. Fixed rentals, no balloon payment, and simple return at the end. Road tax is typically included, with maintenance optional.",
      bullets: [
        "Cost-effective monthly rentals",
        "Small initial payment compared with purchase",
        "No final balloon payment",
        "Easier budgeting and fleet planning",
      ],
    },
    {
      title: "Business Contract Purchase",
      description:
        "A hybrid option with the ability to buy at the end for a pre-agreed amount (GFV). Often lower monthly cost than hire purchase.",
      bullets: [
        "Option to purchase at the end",
        "Fixed monthly costs with potential equity",
        "VAT on rentals not usually charged",
        "Profit possible if market value exceeds GFV",
      ],
      considerations: [
        "Interest applies to the full vehicle value",
        "Mileage caps may apply",
        "Early settlement can create negative equity",
      ],
    },
    {
      title: "Business Finance Lease",
      description:
        "A rental agreement where the business does not own the vehicle but may benefit from selling it at the end of the term.",
      bullets: [
        "Lower upfront costs",
        "VAT reclaim possible (conditions apply)",
        "Potential share of sale proceeds",
      ],
      considerations: [
        "No option to buy the vehicle",
        "Business may need to arrange sale at end",
        "Vehicle appears as a liability on accounts",
      ],
    },
  ],
};

export const faqs: FaqItem[] = [
  {
    question: "What exactly is car leasing?",
    answer:
      "Car leasing is a long-term rental where you choose the vehicle and contract length, then pay a fixed monthly rental. At the end of the agreement, the car is returned and you can choose a new lease.",
  },
  {
    question: "What are the benefits of leasing?",
    answer:
      "Leasing offers predictable monthly costs, lower upfront payments, access to newer vehicles, and no resale hassle at the end of the term.",
  },
  {
    question: "How popular is leasing in the UK?",
    answer:
      "Leasing has grown steadily and now represents a large share of new vehicle funding in the UK market.",
  },
  {
    question: "Is leasing the same as Personal Contract Hire (PCH)?",
    answer:
      "Yes. PCH is the formal name for personal car leasing, with fixed rentals and a return at the end of the agreement.",
  },
  {
    question: "Is PCH different to PCP?",
    answer:
      "Yes. PCP includes the option to purchase the vehicle at the end, while PCH is a return-only agreement.",
  },
  {
    question: "I have always bought my cars. Why lease?",
    answer:
      "Leasing helps avoid depreciation, keeps costs predictable, and offers easier access to newer vehicles without resale effort.",
  },
  {
    question: "I cannot see the exact model I want. What should I do?",
    answer:
      "Contact us with the model and specification you want and we can help source it or suggest close alternatives.",
  },
  {
    question: "Do you offer every car on the market?",
    answer:
      "We cover all leading makes and models and offer a wide range of specifications and trims.",
  },
  {
    question: "Are all the cars you offer brand new?",
    answer:
      "Yes, vehicles are brand new unless specifically stated as pre-registered or used.",
  },
  {
    question: "What is the leasing process?",
    answer:
      "Choose your vehicle and contract, complete the credit check, sign the paperwork, then take delivery and enjoy the car. We will help you change vehicles when the term ends.",
  },
  {
    question: "What age do I need to be to lease a car?",
    answer:
      "You need to be at least 18 years old to enter a finance agreement, with a valid UK licence.",
  },
  {
    question: "Can I pay the initial rental by credit card?",
    answer:
      "Initial rentals are usually taken from the approved bank account and paid by direct debit.",
  },
  {
    question: "I have just passed my driving test. Can I lease?",
    answer:
      "Yes, provided you are over 18, hold a full UK licence, and meet the credit criteria.",
  },
  {
    question: "Which ID documents are required?",
    answer:
      "Requirements depend on credit checks but commonly include proof of identity, address, and income.",
  },
  {
    question: "What are the shortest and longest lease terms?",
    answer:
      "Standard terms are usually 24 to 60 months. Shorter agreements may be available for select vehicles.",
  },
  {
    question: "How do I estimate annual mileage?",
    answer:
      "Use past MOT records or servicing history to estimate a realistic annual mileage to avoid excess charges.",
  },
  {
    question: "How quickly can I get a car?",
    answer:
      "In-stock vehicles can often be delivered quickly, while factory orders take longer depending on manufacturer lead times.",
  },
  {
    question: "What does a 9+23 or 6+35 payment profile mean?",
    answer:
      "It describes the initial rental and remaining monthly payments. For example, 9+23 is a 24-month term with nine months upfront and 23 monthly payments.",
  },
  {
    question: "Why are your prices so low?",
    answer:
      "Broker relationships and fleet pricing help secure competitive rates. We aim to keep offers market-leading.",
  },
];
