import { ContentBlock } from "../../lib/blog/types";

const calloutStyles = {
  tip: {
    bg: "bg-teal-500/5",
    border: "border-teal-500/20",
    icon: "text-teal-500",
    iconPath: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  },
  warning: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    icon: "text-amber-500",
    iconPath: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
  info: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    icon: "text-blue-500",
    iconPath: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  },
};

function renderBlock(block: ContentBlock, index: number) {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={index} className="text-white/60 leading-relaxed mb-6">
          {block.text}
        </p>
      );

    case "heading":
      if (block.level === 2) {
        return (
          <h2
            key={index}
            id={block.id}
            className="text-2xl md:text-3xl font-bold text-white mt-12 mb-4 scroll-mt-24"
          >
            {block.text}
          </h2>
        );
      }
      return (
        <h3
          key={index}
          id={block.id}
          className="text-xl font-bold text-white mt-8 mb-3 scroll-mt-24"
        >
          {block.text}
        </h3>
      );

    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag
          key={index}
          className={`mb-6 space-y-2 text-white/60 ${
            block.ordered ? "list-decimal" : "list-disc"
          } pl-6`}
        >
          {block.items.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </Tag>
      );
    }

    case "callout": {
      const style = calloutStyles[block.variant];
      return (
        <div
          key={index}
          className={`${style.bg} border ${style.border} rounded-xl p-5 mb-6`}
        >
          <div className="flex items-start gap-3">
            <svg
              className={`w-5 h-5 ${style.icon} mt-0.5 shrink-0`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={style.iconPath} />
            </svg>
            <div>
              <p className="text-white font-semibold text-sm mb-1">{block.title}</p>
              <p className="text-white/50 text-sm leading-relaxed">{block.text}</p>
            </div>
          </div>
        </div>
      );
    }

    case "stat":
      return (
        <div
          key={index}
          className="bg-white/[0.03] border border-white/10 rounded-xl p-6 mb-6 text-center"
        >
          <p className="text-4xl font-black text-teal-500 mb-1">{block.value}</p>
          <p className="text-sm text-white/40">{block.label}</p>
        </div>
      );

    case "stats":
      return (
        <div key={index} className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {block.items.map((s, i) => (
            <div
              key={i}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-5 text-center"
            >
              <p className="text-2xl md:text-3xl font-black text-teal-500 mb-1">{s.value}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>
      );

    case "quote":
      return (
        <blockquote
          key={index}
          className="border-l-2 border-teal-500/40 pl-6 my-8"
        >
          <p className="text-lg text-white/70 italic leading-relaxed">
            &ldquo;{block.text}&rdquo;
          </p>
          {block.author && (
            <p className="text-sm text-white/30 mt-3">&mdash; {block.author}</p>
          )}
        </blockquote>
      );

    case "cta":
      return (
        <div
          key={index}
          className="bg-teal-600/10 border border-teal-500/20 rounded-2xl p-8 my-10 text-center"
        >
          <h3 className="text-xl font-bold text-white mb-2">{block.title}</h3>
          <p className="text-white/50 mb-6">{block.text}</p>
          <a
            href={block.buttonUrl}
            className="inline-block bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3 rounded text-sm uppercase tracking-wider transition-colors"
          >
            {block.buttonText}
          </a>
        </div>
      );

    default:
      return null;
  }
}

export function PostContent({ blocks }: { blocks: ContentBlock[] }) {
  return <div>{blocks.map((block, i) => renderBlock(block, i))}</div>;
}
