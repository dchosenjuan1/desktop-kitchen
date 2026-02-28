export function AuthorCard({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  return (
    <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-xl p-5">
      <div className="w-12 h-12 rounded-full bg-teal-600/20 flex items-center justify-center text-teal-500 font-bold text-lg shrink-0">
        {name.charAt(0)}
      </div>
      <div>
        <p className="text-white font-semibold">{name}</p>
        <p className="text-sm text-white/40">{role}</p>
      </div>
    </div>
  );
}
