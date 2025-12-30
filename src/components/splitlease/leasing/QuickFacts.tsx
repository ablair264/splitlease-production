interface QuickFactsProps {
  facts: Array<{ label: string; value: string }>;
}

export default function QuickFacts({ facts }: QuickFactsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="rounded-2xl border border-white/10 bg-[#1a1f2a] p-5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.6)]"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
            {fact.label}
          </p>
          <p className="mt-2 text-lg font-bold text-white">{fact.value}</p>
        </div>
      ))}
    </div>
  );
}
