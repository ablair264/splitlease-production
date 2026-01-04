"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ArrowRight,
  Check,
  Building2,
  Users,
  Leaf,
  PiggyBank,
  Shield,
  Zap,
  Car,
  Phone,
  Mail,
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import BlurText from "@/components/BlurText";
import FadeContent from "@/components/FadeContent";
import Stack from "@/components/Stack";
import CountUp from "@/components/CountUp";

// SplitLease color scheme
const colors = {
  dark: "#0f1419",
  darkMid: "#1a1f2a",
  darkLight: "#2c3e50",
  accent: "#79d5e9",
  accentOrange: "#f77d11",
  text: "#ffffff",
  textMuted: "rgba(255, 255, 255, 0.7)",
};

// Trust logos data
const trustLogos = [
  { name: "Deloitte", initials: "D" },
  { name: "PwC", initials: "PwC" },
  { name: "NHS Trust", initials: "NHS" },
  { name: "Rolls Royce", initials: "RR" },
  { name: "BAE Systems", initials: "BAE" },
  { name: "Jaguar Land Rover", initials: "JLR" },
];

// Why choose data - accordion style
const whyChooseItems = [
  {
    id: "savings",
    title: "MASSIVE TAX SAVINGS",
    description: "Employees save up to 40% on a brand new EV through salary sacrifice. No deposit, no credit check, just straightforward savings from gross salary.",
  },
  {
    id: "zero-cost",
    title: "ZERO COST TO EMPLOYER",
    description: "Setting up a salary sacrifice scheme costs you nothing. In fact, you save on National Insurance contributions for every employee enrolled.",
  },
  {
    id: "all-inclusive",
    title: "ALL-INCLUSIVE PACKAGE",
    description: "Insurance, maintenance, breakdown cover, and road tax all included in one simple monthly payment. No surprises, no hidden costs.",
  },
  {
    id: "sustainability",
    title: "HIT YOUR NET ZERO TARGETS",
    description: "Electric vehicles only. Reduce your company's Scope 3 emissions and demonstrate real commitment to sustainability.",
  },
  {
    id: "retention",
    title: "ATTRACT & RETAIN TALENT",
    description: "Offer a benefit employees actually want. In a competitive job market, a salary sacrifice EV scheme sets you apart.",
  },
];

// Stats data
const stats = [
  { value: 40, suffix: "%", label: "Average Employee Savings" },
  { value: 5000, prefix: "£", label: "Typical Annual Saving" },
  { value: 500, suffix: "+", label: "Vehicles Available" },
  { value: 14, suffix: " Days", label: "Average Setup Time" },
];

// Benefits for companies
const companyBenefits = [
  {
    icon: PiggyBank,
    title: "Save on NI Contributions",
    description: "Reduce your National Insurance bill by up to 15.05% on every salary sacrifice payment.",
  },
  {
    icon: Users,
    title: "Boost Employee Satisfaction",
    description: "Offer a genuinely valuable benefit that improves retention and attracts top talent.",
  },
  {
    icon: Leaf,
    title: "Meet ESG Goals",
    description: "Demonstrate environmental leadership. Every EV reduces your carbon footprint.",
  },
  {
    icon: Shield,
    title: "Zero Risk Implementation",
    description: "We handle everything. No upfront costs, no admin burden, no residual value risk.",
  },
];

// Benefits for employees
const employeeBenefits = [
  {
    icon: Zap,
    title: "Drive a Brand New EV",
    description: "Access the latest electric vehicles at a fraction of the cost.",
  },
  {
    icon: PiggyBank,
    title: "Save Up to 40%",
    description: "Pay from gross salary before tax and NI deductions.",
  },
  {
    icon: Shield,
    title: "Everything Included",
    description: "Insurance, maintenance, road tax, breakdown cover - all in one payment.",
  },
  {
    icon: Check,
    title: "No Credit Check",
    description: "The agreement is with your employer, not a finance company.",
  },
];

// Vehicle cards for Stack component
const vehicleCards = [
  {
    make: "Tesla",
    model: "Model 3",
    monthlyFrom: 299,
    image: "/images/vehicles/tesla-model-3.jpg",
    saving: "£412/month",
  },
  {
    make: "BMW",
    model: "iX1",
    monthlyFrom: 349,
    image: "/images/vehicles/bmw-ix1.jpg",
    saving: "£389/month",
  },
  {
    make: "Hyundai",
    model: "IONIQ 6",
    monthlyFrom: 329,
    image: "/images/vehicles/hyundai-ioniq-6.jpg",
    saving: "£356/month",
  },
  {
    make: "Volkswagen",
    model: "ID.4",
    monthlyFrom: 319,
    image: "/images/vehicles/vw-id4.jpg",
    saving: "£378/month",
  },
];

// FAQ data
const faqs = [
  {
    q: "How much can employees actually save?",
    a: "Savings depend on tax bracket. A 40% taxpayer typically saves around 40% compared to buying outright. Even basic rate taxpayers save over 30% thanks to BIK rates on EVs being just 2%.",
  },
  {
    q: "What happens if an employee leaves?",
    a: "We offer flexible options including early termination, transfer to another employer with a scheme, or the employee can choose to fund the remaining payments personally.",
  },
  {
    q: "Is there a minimum company size?",
    a: "No. We work with businesses from 5 employees to 50,000+. The scheme economics work at any scale.",
  },
  {
    q: "How long does setup take?",
    a: "Typically 2 weeks from agreement to employees ordering vehicles. We handle all the paperwork and integration.",
  },
  {
    q: "What vehicles are available?",
    a: "Over 500 electric and plug-in hybrid vehicles from all major manufacturers. From compact cars to premium SUVs.",
  },
];

export default function SalarySacrificeLanding() {
  const [expandedItem, setExpandedItem] = useState<string | null>("savings");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.dark }}>
      <Header />

      {/* Hero Section - Bold, Full-Bleed */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background gradient accent */}
        <div
          className="absolute top-0 right-0 w-1/2 h-full opacity-10"
          style={{
            background: `radial-gradient(ellipse at 100% 0%, ${colors.accent} 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Headline */}
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 mb-8 text-sm font-medium"
                style={{
                  backgroundColor: `${colors.accent}15`,
                  color: colors.accent,
                  border: `1px solid ${colors.accent}30`,
                }}
              >
                <Zap size={16} />
                EV Salary Sacrifice
              </div>

              <BlurText
                text="ELECTRIC CARS."
                className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-none"
                delay={100}
                animateBy="words"
              />
              <div style={{ color: colors.accent }}>
                <BlurText
                  text="TAX FREE."
                  className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none mt-2"
                  delay={150}
                  animateBy="words"
                />
              </div>

              <p className="mt-8 text-lg md:text-xl text-white/70 max-w-lg leading-relaxed">
                Like the cycle-to-work scheme, but for electric cars.
                <span className="text-white font-medium"> Zero cost to employers. Up to 40% savings for employees.</span>
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="#employer-form"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-bold text-black transition-all hover:scale-105"
                  style={{ backgroundColor: colors.accent }}
                >
                  <Building2 size={20} />
                  For Employers
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="#employee-section"
                  className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-white border-2 border-white/20 transition-all hover:bg-white/5 hover:border-white/30"
                >
                  <Users size={20} />
                  For Employees
                </Link>
              </div>
            </div>

            {/* Right - Vehicle Stack */}
            <div className="relative h-[400px] lg:h-[500px]">
              <Stack
                cards={vehicleCards.map((vehicle, idx) => (
                  <div
                    key={idx}
                    className="w-full h-full rounded-2xl overflow-hidden"
                    style={{ backgroundColor: colors.darkMid }}
                  >
                    <div className="relative h-2/3 bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                      <Car size={120} className="text-white/20" />
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-white/60">{vehicle.make}</p>
                      <p className="text-xl font-bold text-white">{vehicle.model}</p>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-2xl font-bold" style={{ color: colors.accent }}>
                          £{vehicle.monthlyFrom}
                        </span>
                        <span className="text-white/60">/month</span>
                      </div>
                      <p className="mt-2 text-sm" style={{ color: colors.accentOrange }}>
                        You save {vehicle.saving}
                      </p>
                    </div>
                  </div>
                ))}
                autoplay
                autoplayDelay={4000}
                pauseOnHover
                sendToBackOnClick
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Logos Bar */}
      <section
        className="border-y border-white/10 py-8"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-white/50 whitespace-nowrap">
              Trusted by leading employers
            </p>
            <div className="flex items-center gap-8 md:gap-12 overflow-x-auto">
              {trustLogos.map((logo) => (
                <div
                  key={logo.name}
                  className="text-white/40 font-bold text-lg md:text-xl tracking-wider whitespace-nowrap hover:text-white/60 transition-colors"
                >
                  {logo.initials}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Section - Accordion Style */}
      <section className="py-24" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left - Title */}
            <div className="lg:sticky lg:top-32">
              <FadeContent blur duration={600}>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                  WHY CHOOSE
                  <br />
                  <span
                    className="relative inline-block"
                    style={{ color: colors.accent }}
                  >
                    SPLITLEASE
                    <span
                      className="absolute -bottom-2 left-0 w-full h-1"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </span>
                  ?
                </h2>
              </FadeContent>
              <p className="mt-6 text-lg text-white/60 max-w-md">
                Our salary sacrifice scheme was built from the ground up, putting businesses and their employees first.
              </p>
            </div>

            {/* Right - Accordion */}
            <div className="space-y-4">
              {whyChooseItems.map((item) => (
                <FadeContent key={item.id} blur duration={500} delay={100}>
                  <div
                    className="border border-white/10 rounded-xl overflow-hidden transition-all cursor-pointer"
                    style={{
                      backgroundColor: expandedItem === item.id ? `${colors.accent}10` : "transparent",
                      borderColor: expandedItem === item.id ? colors.accent : "rgba(255,255,255,0.1)",
                    }}
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  >
                    <div className="flex items-center justify-between p-6">
                      <h3
                        className="text-lg md:text-xl font-bold tracking-wide"
                        style={{
                          color: expandedItem === item.id ? colors.accent : colors.text,
                        }}
                      >
                        {item.title}
                      </h3>
                      <ChevronDown
                        size={24}
                        className="transition-transform"
                        style={{
                          transform: expandedItem === item.id ? "rotate(180deg)" : "rotate(0deg)",
                          color: expandedItem === item.id ? colors.accent : "rgba(255,255,255,0.5)",
                        }}
                      />
                    </div>
                    <AnimatePresence>
                      {expandedItem === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="px-6 pb-6">
                            <p className="text-white/70 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FadeContent>
              ))}

              <Link
                href="/cars?fuelType=electric"
                className="inline-flex items-center gap-2 mt-6 text-sm font-medium transition-colors hover:text-white"
                style={{ color: colors.accent }}
              >
                Search Available Cars
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        className="py-20 border-y border-white/10"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
            {stats.map((stat, index) => (
              <FadeContent key={stat.label} blur duration={600} delay={index * 100}>
                <div className="text-center">
                  <div className="text-4xl md:text-5xl lg:text-6xl font-black text-white">
                    {stat.prefix}
                    <CountUp to={stat.value} duration={2} separator="," />
                    {stat.suffix}
                  </div>
                  <p className="mt-2 text-sm md:text-base text-white/60">
                    {stat.label}
                  </p>
                </div>
              </FadeContent>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits for Companies */}
      <section className="py-24" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <FadeContent blur duration={600}>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
              BENEFITS FOR
              <br />
              <span
                className="relative inline-block"
                style={{ color: colors.accent }}
              >
                COMPANIES
                <span
                  className="absolute -bottom-2 left-0 w-full h-1"
                  style={{ backgroundColor: colors.accent }}
                />
              </span>
            </h2>
          </FadeContent>
          <p className="mt-6 text-lg text-white/60 max-w-2xl">
            Reducing attrition, lowering your tax bill, and cutting Scope 3 emissions are just a few ways our scheme helps businesses.
          </p>

          {/* Asymmetric Grid */}
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companyBenefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <FadeContent
                  key={benefit.title}
                  blur
                  duration={500}
                  delay={index * 100}
                  className={index === 0 ? "lg:col-span-2 lg:row-span-2" : ""}
                >
                  <div
                    className={`h-full rounded-2xl border border-white/10 p-8 transition-all hover:border-white/20 cursor-pointer ${
                      index === 0 ? "lg:p-12" : ""
                    }`}
                    style={{ backgroundColor: `${colors.darkMid}50` }}
                  >
                    <div
                      className={`inline-flex items-center justify-center rounded-xl ${
                        index === 0 ? "h-16 w-16" : "h-12 w-12"
                      }`}
                      style={{ backgroundColor: `${colors.accent}20` }}
                    >
                      <Icon
                        size={index === 0 ? 32 : 24}
                        style={{ color: colors.accent }}
                      />
                    </div>
                    <h3
                      className={`mt-6 font-bold text-white ${
                        index === 0 ? "text-2xl md:text-3xl" : "text-xl"
                      }`}
                    >
                      {benefit.title}
                    </h3>
                    <p
                      className={`mt-4 text-white/60 leading-relaxed ${
                        index === 0 ? "text-lg" : ""
                      }`}
                    >
                      {benefit.description}
                    </p>
                  </div>
                </FadeContent>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits for Employees */}
      <section
        id="employee-section"
        className="py-24"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div>
              <FadeContent blur duration={600}>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
                  BENEFITS FOR
                  <br />
                  <span
                    className="relative inline-block"
                    style={{ color: colors.accentOrange }}
                  >
                    EMPLOYEES
                    <span
                      className="absolute -bottom-2 left-0 w-full h-1"
                      style={{ backgroundColor: colors.accentOrange }}
                    />
                  </span>
                </h2>
              </FadeContent>
              <p className="mt-6 text-lg text-white/60">
                Massive savings, an all-inclusive package, and a dream car at an affordable price – what's not to love?
              </p>

              <div className="mt-12 space-y-6">
                {employeeBenefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <FadeContent
                      key={benefit.title}
                      blur
                      duration={500}
                      delay={index * 100}
                    >
                      <div className="flex gap-4">
                        <div
                          className="flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${colors.accentOrange}20` }}
                        >
                          <Icon size={24} style={{ color: colors.accentOrange }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {benefit.title}
                          </h3>
                          <p className="mt-1 text-white/60">
                            {benefit.description}
                          </p>
                        </div>
                      </div>
                    </FadeContent>
                  );
                })}
              </div>

              <div className="mt-10">
                <p className="text-sm text-white/50 mb-4">
                  Ask your employer about SplitLease
                </p>
                <Link
                  href="/cars?fuelType=electric"
                  className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-black transition-all hover:scale-105"
                  style={{ backgroundColor: colors.accentOrange }}
                >
                  Browse Electric Vehicles
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            {/* Right - Savings Calculator Preview */}
            <FadeContent blur duration={600} delay={200}>
              <div
                className="rounded-3xl p-8 md:p-10"
                style={{
                  backgroundColor: colors.dark,
                  border: `1px solid ${colors.accentOrange}30`,
                }}
              >
                <p
                  className="text-sm font-medium tracking-wide"
                  style={{ color: colors.accentOrange }}
                >
                  EXAMPLE SAVINGS
                </p>
                <h3 className="mt-4 text-2xl md:text-3xl font-bold text-white">
                  Tesla Model 3
                </h3>
                <p className="mt-2 text-white/60">40% Taxpayer</p>

                <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/60">List Price (PCP)</span>
                    <span className="text-white font-medium">£549/month</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-white/60">Salary Sacrifice</span>
                    <span className="text-white font-bold text-xl" style={{ color: colors.accent }}>
                      £299/month
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-white font-medium">Your Saving</span>
                    <span
                      className="text-2xl font-black"
                      style={{ color: colors.accentOrange }}
                    >
                      £250/month
                    </span>
                  </div>
                </div>

                <div
                  className="mt-8 rounded-xl p-4 text-center"
                  style={{ backgroundColor: `${colors.accentOrange}15` }}
                >
                  <p
                    className="text-3xl font-black"
                    style={{ color: colors.accentOrange }}
                  >
                    £3,000
                  </p>
                  <p className="text-sm text-white/60">saved per year</p>
                </div>
              </div>
            </FadeContent>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="text-center mb-16">
            <FadeContent blur duration={600}>
              <h2 className="text-4xl md:text-5xl font-black text-white">
                HOW DOES IT WORK?
              </h2>
            </FadeContent>
            <p className="mt-4 text-lg text-white/60 max-w-2xl mx-auto">
              Like a cycle-to-work scheme – monthly cost is taken from gross salary, before tax, resulting in savings of up to 40%.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Employer Signs Up",
                description: "Quick setup with zero cost. We integrate with your payroll and handle all administration.",
              },
              {
                step: "02",
                title: "Employees Choose",
                description: "Staff browse our range, select their dream EV, and see instant quotes with real savings.",
              },
              {
                step: "03",
                title: "Drive Away",
                description: "Monthly payment deducted from gross salary. Insurance, maintenance, and tax all included.",
              },
            ].map((item, index) => (
              <FadeContent key={item.step} blur duration={500} delay={index * 150}>
                <div className="relative">
                  <div
                    className="text-8xl font-black opacity-10"
                    style={{ color: colors.accent }}
                  >
                    {item.step}
                  </div>
                  <div className="mt-[-40px] relative z-10">
                    <h3 className="text-xl font-bold text-white">{item.title}</h3>
                    <p className="mt-3 text-white/60 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </FadeContent>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="employer-form"
        className="py-24"
        style={{ backgroundColor: colors.darkMid }}
      >
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left - Employer CTA */}
            <FadeContent blur duration={600}>
              <div
                className="rounded-3xl p-8 md:p-12 h-full"
                style={{
                  background: `linear-gradient(135deg, ${colors.accent}15 0%, transparent 100%)`,
                  border: `1px solid ${colors.accent}30`,
                }}
              >
                <Building2 size={48} style={{ color: colors.accent }} />
                <h3 className="mt-6 text-3xl md:text-4xl font-black text-white">
                  For Employers
                </h3>
                <p className="mt-4 text-white/60 text-lg">
                  Ready to offer your team the benefit they actually want? Book a demo and we'll show you exactly how it works.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Zero setup cost",
                    "Live in 2 weeks",
                    "Dedicated account manager",
                    "Full admin support",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check size={18} style={{ color: colors.accent }} />
                      <span className="text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/contact?type=employer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-bold text-black transition-all hover:scale-105"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Book a Demo
                    <ArrowRight size={18} />
                  </Link>
                  <a
                    href="tel:01onal905686887"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-base font-semibold text-white border border-white/20 hover:bg-white/5 transition-all"
                  >
                    <Phone size={18} />
                    Call Us
                  </a>
                </div>
              </div>
            </FadeContent>

            {/* Right - Employee CTA */}
            <FadeContent blur duration={600} delay={200}>
              <div
                className="rounded-3xl p-8 md:p-12 h-full"
                style={{
                  background: `linear-gradient(135deg, ${colors.accentOrange}15 0%, transparent 100%)`,
                  border: `1px solid ${colors.accentOrange}30`,
                }}
              >
                <Users size={48} style={{ color: colors.accentOrange }} />
                <h3 className="mt-6 text-3xl md:text-4xl font-black text-white">
                  For Employees
                </h3>
                <p className="mt-4 text-white/60 text-lg">
                  Want access to salary sacrifice? Ask your employer about SplitLease, or share our info pack with your HR team.
                </p>
                <ul className="mt-8 space-y-3">
                  {[
                    "Save up to 40% on a new EV",
                    "No credit check required",
                    "Insurance & maintenance included",
                    "Choose from 500+ vehicles",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3">
                      <Check size={18} style={{ color: colors.accentOrange }} />
                      <span className="text-white/80">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/cars?fuelType=electric"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-bold text-black transition-all hover:scale-105"
                    style={{ backgroundColor: colors.accentOrange }}
                  >
                    Browse Vehicles
                    <ArrowRight size={18} />
                  </Link>
                  <a
                    href="mailto:hello@splitlease.co.uk?subject=Salary%20Sacrifice%20Info%20for%20My%20Employer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-4 text-base font-semibold text-white border border-white/20 hover:bg-white/5 transition-all"
                  >
                    <Mail size={18} />
                    Email HR
                  </a>
                </div>
              </div>
            </FadeContent>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24" style={{ backgroundColor: colors.dark }}>
        <div className="mx-auto max-w-3xl px-4 md:px-6 lg:px-8">
          <div className="text-center mb-16">
            <FadeContent blur duration={600}>
              <h2 className="text-4xl md:text-5xl font-black text-white">
                COMMON QUESTIONS
              </h2>
            </FadeContent>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FadeContent key={index} blur duration={500} delay={index * 50}>
                <div
                  className="border border-white/10 rounded-xl overflow-hidden cursor-pointer"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <div className="flex items-center justify-between p-6">
                    <h3 className="text-lg font-semibold text-white pr-4">
                      {faq.q}
                    </h3>
                    <ChevronDown
                      size={20}
                      className="flex-shrink-0 transition-transform text-white/50"
                      style={{
                        transform: expandedFaq === index ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                  <AnimatePresence>
                    {expandedFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="px-6 pb-6">
                          <p className="text-white/70 leading-relaxed">{faq.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeContent>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="py-20"
        style={{
          background: `linear-gradient(180deg, ${colors.dark} 0%, ${colors.darkMid} 100%)`,
        }}
      >
        <div className="mx-auto max-w-4xl px-4 md:px-6 lg:px-8 text-center">
          <FadeContent blur duration={600}>
            <h2 className="text-3xl md:text-5xl font-black text-white">
              READY TO GET STARTED?
            </h2>
            <p className="mt-6 text-lg text-white/60 max-w-2xl mx-auto">
              Join hundreds of UK businesses already offering EV salary sacrifice. Zero cost to implement, massive benefits for everyone.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/contact?type=employer"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-bold text-black transition-all hover:scale-105"
                style={{ backgroundColor: colors.accent }}
              >
                Book a Demo
                <ArrowRight size={18} />
              </Link>
              <a
                href="tel:01905686887"
                className="inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-white border-2 border-white/20 transition-all hover:bg-white/5"
              >
                <Phone size={18} />
                01905 686887
              </a>
            </div>
          </FadeContent>
        </div>
      </section>

      <Footer />
    </div>
  );
}
