import type { FeatureItem } from "./content";

interface FeatureGridProps {
  title: string;
  subtitle?: string;
  items: FeatureItem[];
}

export default function FeatureGrid({ title, subtitle, items }: FeatureGridProps) {
  return (
    <section className="space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white sm:text-4xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-400">
            {subtitle}
          </p>
        )}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="group rounded-2xl border border-white/10 bg-[#1a1f2a] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#79d5e9]/40 hover:shadow-[0_15px_50px_-30px_rgba(119,212,233,0.4)]"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#79d5e9]/10 text-[#79d5e9] transition-all group-hover:bg-[#79d5e9] group-hover:text-[#0f1419]">
              <span className="h-2 w-2 rounded-full bg-current" />
            </div>
            <h3 className="text-lg font-bold text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
