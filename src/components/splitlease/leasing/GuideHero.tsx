import Link from "next/link";

interface GuideHeroProps {
  badge: string;
  title: string;
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export default function GuideHero({
  badge,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
}: GuideHeroProps) {
  return (
    <header className="relative overflow-hidden border-b border-white/10 bg-[#0f1419]">
      <div className="absolute -right-48 -top-40 h-96 w-96 rounded-full bg-[#79d5e9]/10 blur-[120px]" />
      <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-[#2c3e50]/50 blur-[140px]" />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-20 text-left">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#79d5e9]/30 bg-[#79d5e9]/10 px-4 py-1.5">
          <span className="h-2 w-2 rounded-full bg-[#79d5e9]" />
          <span className="text-xs font-bold uppercase tracking-wide text-[#79d5e9]">
            {badge}
          </span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-2xl text-lg text-gray-300 sm:text-xl">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href={primaryCta.href}
            className="inline-flex h-14 items-center justify-center rounded-xl bg-[#79d5e9] px-8 text-base font-bold text-[#0f1419] transition-all duration-300 hover:bg-white hover:shadow-[0_0_30px_rgba(119,212,233,0.4)]"
          >
            {primaryCta.label}
          </Link>
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="inline-flex h-14 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-8 text-base font-bold text-white transition-all duration-300 hover:border-[#79d5e9]/60 hover:text-[#79d5e9]"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
