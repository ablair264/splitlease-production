import Footer from "@/components/splitlease/Footer";
import Header from "@/components/splitlease/Header";
import VehicleChatWidget from "@/components/splitlease/VehicleChatWidget";
import FeatureGrid from "@/components/splitlease/leasing/FeatureGrid";
import GuideCta from "@/components/splitlease/leasing/GuideCta";
import GuideHero from "@/components/splitlease/leasing/GuideHero";
import GuideSection from "@/components/splitlease/leasing/GuideSection";
import LeaseTypes from "@/components/splitlease/leasing/LeaseTypes";
import QuickFacts from "@/components/splitlease/leasing/QuickFacts";
import { businessGuide } from "@/components/splitlease/leasing/content";

export default function BusinessLeasingGuidePage() {
  return (
    <>
      <Header />
      <div className="bg-[#0f1419]">
        <GuideHero {...businessGuide.hero} />
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          <QuickFacts facts={businessGuide.quickFacts} />
          {businessGuide.sections.map((section) => (
            <GuideSection key={section.id} {...section} />
          ))}
          <FeatureGrid
            title="Benefits for businesses"
            subtitle="From cash flow to compliance, business leasing keeps fleets modern and manageable."
            items={businessGuide.benefits}
          />
          <LeaseTypes items={businessGuide.leaseTypes} />
          <GuideCta
            title="Plan a smarter fleet"
            subtitle="Compare business lease options or speak to our team about the right contract for your company."
            primary={{ label: "View business deals", href: "/cars" }}
            secondary={{ label: "Talk to a specialist", href: "/contact" }}
          />
        </main>
      </div>
      <Footer />
      <VehicleChatWidget />
    </>
  );
}
