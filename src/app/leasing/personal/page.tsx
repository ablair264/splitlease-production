import Footer from "@/components/splitlease/Footer";
import Header from "@/components/splitlease/Header";
import VehicleChatWidget from "@/components/splitlease/VehicleChatWidget";
import FeatureGrid from "@/components/splitlease/leasing/FeatureGrid";
import GuideCta from "@/components/splitlease/leasing/GuideCta";
import GuideHero from "@/components/splitlease/leasing/GuideHero";
import GuideSection from "@/components/splitlease/leasing/GuideSection";
import QuickFacts from "@/components/splitlease/leasing/QuickFacts";
import { personalGuide } from "@/components/splitlease/leasing/content";

export default function PersonalLeasingGuidePage() {
  return (
    <>
      <Header />
      <div className="bg-[#0f1419]">
        <GuideHero {...personalGuide.hero} />
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          <QuickFacts facts={personalGuide.quickFacts} />
          {personalGuide.sections.map((section) => (
            <GuideSection key={section.id} {...section} />
          ))}
          <FeatureGrid
            title="Benefits of personal leasing"
            subtitle="The key advantages drivers choose when they want predictable costs and hassle-free upgrades."
            items={personalGuide.benefits}
          />
          <FeatureGrid
            title="What is included"
            subtitle="Most personal leases include the essentials, with optional maintenance if you want fixed-cost servicing."
            items={personalGuide.included}
          />
          <GuideSection
            id="eligibility"
            eyebrow="Eligibility"
            title={personalGuide.eligibility.title}
            paragraphs={personalGuide.eligibility.paragraphs}
            bullets={personalGuide.eligibility.bullets}
          />
          <GuideCta
            title="Ready to choose your next car?"
            subtitle="Browse the latest personal lease deals and lock in fixed monthly pricing on the model you want."
            primary={{ label: "Browse personal deals", href: "/cars" }}
            secondary={{ label: "Speak to an expert", href: "/contact" }}
          />
        </main>
      </div>
      <Footer />
      <VehicleChatWidget />
    </>
  );
}
