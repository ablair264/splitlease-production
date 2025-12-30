interface GuideSectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

export default function GuideSection({
  id,
  eyebrow,
  title,
  paragraphs,
  bullets,
}: GuideSectionProps) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-3xl border border-white/10 bg-[#1a1f2a] p-8 shadow-2xl sm:p-10"
    >
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-widest text-[#79d5e9]">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
        {title}
      </h2>
      <div className="mt-6 space-y-4 text-gray-300">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-base leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      {bullets && bullets.length > 0 && (
        <ul className="mt-6 grid gap-3 text-sm text-gray-300 sm:grid-cols-2">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/5 p-4"
            >
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#79d5e9]" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
