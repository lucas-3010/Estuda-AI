import { PLANS, PLAN_IDS, formatPrice } from "@/lib/billing/plans";
import { PlanButton } from "./PlanButton";

export function Pricing() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {PLAN_IDS.map((id) => {
        const plan = PLANS[id];
        const featured = id === "pro";
        return (
          <section
            key={id}
            aria-labelledby={`plano-${id}`}
            className={`flex flex-col rounded-2xl border p-5 ${
              featured
                ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 dark:bg-indigo-950/40"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 id={`plano-${id}`} className="text-lg font-semibold">
                {plan.name}
              </h3>
              {featured && (
                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
                  Recomendado
                </span>
              )}
            </div>
            <p className="mt-3">
              <span className="text-3xl font-semibold tabular-nums">{plan.price === 0 ? "R$ 0" : formatPrice(plan.price)}</span>
              {plan.price > 0 && <span className="text-sm text-zinc-500">/mês</span>}
            </p>
            <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm">
              {plan.highlights.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-indigo-600 dark:text-indigo-400">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <PlanButton
                plan={id}
                label={plan.price === 0 ? "Começar grátis" : `Assinar ${plan.name}`}
                className={`w-full rounded-lg px-4 py-2.5 font-medium disabled:opacity-60 ${
                  featured
                    ? "bg-indigo-600 text-white hover:bg-indigo-500"
                    : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
