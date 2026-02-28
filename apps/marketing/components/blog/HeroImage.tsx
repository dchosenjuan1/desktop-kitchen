import { categories, getCategoryColors } from "../../lib/blog/categories";
import { CategorySlug } from "../../lib/blog/types";

const categoryGradients: Record<string, string> = {
  teal: "from-teal-900/80 via-teal-800/40 to-neutral-950",
  purple: "from-purple-900/80 via-purple-800/40 to-neutral-950",
  blue: "from-blue-900/80 via-blue-800/40 to-neutral-950",
  amber: "from-amber-900/80 via-amber-800/40 to-neutral-950",
  rose: "from-rose-900/80 via-rose-800/40 to-neutral-950",
  green: "from-green-900/80 via-green-800/40 to-neutral-950",
};

const categorySvgIcons: Record<CategorySlug, string> = {
  guias:
    "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  "ghost-kitchens":
    "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21",
  "ia-tecnologia":
    "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z",
  operaciones:
    "M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m5.406-4.065L11.42 15.17m6.818-7.232a4.5 4.5 0 00-6.364-6.364L3.75 8.25l8.25 8.25 6.24-6.24z",
  delivery:
    "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H6.375c-.621 0-1.125-.504-1.125-1.125V14.25m17.25 0V6.75a2.25 2.25 0 00-2.25-2.25H6.375a2.25 2.25 0 00-2.25 2.25v7.5",
  negocio:
    "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
};

export function HeroImage({
  category,
  size = "md",
}: {
  category: CategorySlug;
  size?: "sm" | "md" | "lg";
}) {
  const cat = categories[category];
  const gradient = categoryGradients[cat.color] || categoryGradients.teal;
  const iconPath = categorySvgIcons[category];

  const sizeClasses = {
    sm: "h-40",
    md: "h-56",
    lg: "h-72 md:h-96",
  };

  const iconSize = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-24 h-24",
  };

  return (
    <div
      className={`relative w-full ${sizeClasses[size]} bg-gradient-to-br ${gradient} rounded-xl overflow-hidden`}
    >
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className={`${iconSize[size]} text-white/10`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={0.75}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      </div>
    </div>
  );
}
