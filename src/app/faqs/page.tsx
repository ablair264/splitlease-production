import Footer from "@/components/splitlease/Footer";
import Header from "@/components/splitlease/Header";
import VehicleChatWidget from "@/components/splitlease/VehicleChatWidget";
import FaqAccordion from "@/components/splitlease/leasing/FaqAccordion";
import GuideHero from "@/components/splitlease/leasing/GuideHero";
import GuideCta from "@/components/splitlease/leasing/GuideCta";
import { faqs } from "@/components/splitlease/leasing/content";

export default function FaqsPage() {
  return (
    <>
      <Header />
      <div className="bg-[#0f1419]">
        <GuideHero
          badge="FAQs"
          title="Leasing FAQs"
          subtitle="Clear answers to the most common questions about leasing, pricing, eligibility, and delivery."
          primaryCta={{ label: "Browse deals", href: "/cars" }}
          secondaryCta={{ label: "Personal guide", href: "/leasing/personal" }}
        />
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-16">
          <FaqAccordion items={faqs} />
          <GuideCta
            title="Need a hand choosing the right lease?"
            subtitle="Our team can walk you through personal and business options and explain the best payment profile for you."
            primary={{ label: "Contact us", href: "/contact" }}
            secondary={{ label: "Business guide", href: "/leasing/business" }}
          />
        </main>
      </div>
      <Footer />
      <VehicleChatWidget />
    </>
  );
}
