import type { ElementType } from "react";

type StatCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ElementType;
  tone?: "cyan" | "green" | "violet" | "orange";
};

const tones = {
  cyan: "text-cyan-200 bg-cyan-400/10 border-cyan-300/20",
  green: "text-emerald-200 bg-emerald-400/10 border-emerald-300/20",
  violet: "text-violet-200 bg-violet-400/10 border-violet-300/20",
  orange: "text-orange-200 bg-orange-400/10 border-orange-300/20"
};

export function StatCard({ label, value, hint, icon: Icon, tone = "cyan" }: StatCardProps) {
  return (
    <article className="glass-panel rounded-3xl p-5 transition hover:-translate-y-1 hover:border-cyan-300/30">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-slate-400">{hint}</p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}
