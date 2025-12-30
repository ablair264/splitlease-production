import Link from "next/link";

interface GuideCtaProps {
  title: string;
  subtitle: string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

export default function GuideCta({
  title,
  subtitle,
  primary,
  secondary,
}: GuideCtaProps) {
  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-[#1a1f2a] via-[#1a1f2a]/80 to-[#252b35]/60 p-10 text-center shadow-2xl sm:p-16">
      <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-[#79d5e9]/10 blur-[120px]" />
      <div className="relative space-y-6">
        <h2 className="text-3xl font-black text-white sm:text-4xl">{title}</h2>
        <p className="mx-auto max-w-2xl text-base text-gray-300">
          {subtitle}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={primary.href}
            className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-2xl bg-[#79d5e9] px-8 text-base font-bold text-[#0f1419] transition-all duration-300 hover:bg-white"
          >
            {primary.label}
          </Link>
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-2xl border border-[#79d5e9]/40 px-8 text-base font-bold text-white transition-all duration-300 hover:border-[#79d5e9] hover:text-[#79d5e9]"
            >
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
