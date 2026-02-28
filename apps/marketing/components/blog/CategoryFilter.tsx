import { categoryList, getCategoryColors } from "../../lib/blog/categories";

export function CategoryFilter({
  active,
  onChange,
  locale,
  allLabel,
}: {
  active: string;
  onChange: (slug: string) => void;
  locale: string;
  allLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onChange("all")}
        className={`text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
          active === "all"
            ? "bg-teal-600 text-white"
            : "bg-white/[0.03] text-white/40 border border-white/10 hover:bg-white/[0.06] hover:text-white/60"
        }`}
      >
        {allLabel}
      </button>
      {categoryList.map((cat) => {
        const colors = getCategoryColors(cat.color);
        const isActive = active === cat.slug;
        return (
          <button
            key={cat.slug}
            onClick={() => onChange(cat.slug)}
            className={`text-xs font-semibold px-4 py-2 rounded-full transition-all duration-200 ${
              isActive
                ? `${colors.bg} text-white`
                : `bg-white/[0.03] text-white/40 border border-white/10 hover:bg-white/[0.06] hover:text-white/60`
            }`}
          >
            {cat.label[locale as "en" | "es"]}
          </button>
        );
      })}
    </div>
  );
}
