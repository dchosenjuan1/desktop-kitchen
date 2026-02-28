export function TableOfContents({
  headings,
  label,
}: {
  headings: { id: string; text: string; level: 2 | 3 }[];
  label: string;
}) {
  if (headings.length === 0) return null;

  return (
    <nav className="bg-white/[0.03] border border-white/5 rounded-xl p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-teal-500/60 font-mono mb-4">
        {label}
      </p>
      <ul className="space-y-2">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
            <a
              href={`#${h.id}`}
              className="text-sm text-white/40 hover:text-teal-400 transition-colors block py-0.5 leading-snug"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
