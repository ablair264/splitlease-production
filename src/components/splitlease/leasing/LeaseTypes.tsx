interface LeaseTypeItem {
  title: string;
  description: string;
  bullets: string[];
  considerations?: string[];
}

interface LeaseTypesProps {
  items: LeaseTypeItem[];
}

export default function LeaseTypes({ items }: LeaseTypesProps) {
  return (
    <section className="space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-black text-white sm:text-4xl">
          Business lease types
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-gray-400">
          Compare the most common business funding options and pick the one that
          suits your accounting and cash flow preferences.
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex h-full flex-col rounded-3xl border border-white/10 bg-[#1a1f2a] p-7 shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white">{item.title}</h3>
            <p className="mt-4 text-sm text-gray-300">{item.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-gray-300">
              {item.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#79d5e9]" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            {item.considerations && item.considerations.length > 0 && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1419]/70 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Things to consider
                </p>
                <ul className="mt-3 space-y-2 text-xs text-gray-400">
                  {item.considerations.map((note) => (
                    <li key={note} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-gray-500" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
