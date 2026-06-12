import type { ElementType } from "react";

export function EmptyState({ icon: Icon, title, text }: { icon: ElementType; title: string; text: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-8 text-center">
      <div>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-4 font-semibold text-white">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{text}</p>
      </div>
    </div>
  );
}
