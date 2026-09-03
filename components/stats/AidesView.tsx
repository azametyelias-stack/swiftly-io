"use client";

import { useRouter } from "next/navigation";

import { NightScreen } from "@/components/ui/NightScreen";
import { useMessages } from "@/lib/i18n/useMessages";

/** SCREEN-13 — static help page. Text is verbatim from `13-aides.md` § 3. */
export function AidesView() {
  const m = useMessages();
  const a = m.aides;
  const router = useRouter();

  const criteria = [
    { key: "liberte", tone: "bg-brand-deep" },
    { key: "investissement", tone: "bg-brand-accent" },
    { key: "epargne", tone: "bg-brand-accent/70" },
    { key: "diversification", tone: "bg-brand-deep/70" },
  ] as const;

  return (
    <NightScreen title={a.title} contentClassName="gap-4 p-4 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-semibold tracking-[-0.024em]">
          {a.intro.heading}
        </h1>
        <p className="t-body text-text-secondary">{a.intro.body}</p>
      </div>

      {criteria.map(({ key, tone }) => {
        const c = a.criteria[key];
        return (
          <section
            key={key}
            className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-surface-card p-4"
          >
            <div className="flex items-center gap-3">
              <span className={`size-10 flex-none rounded-[12px] ${tone}`} />
              <h2 className="t-section-title">{c.title}</h2>
            </div>

            <Block label={a.labels.what}>{c.what}</Block>
            <div className="rounded-[12px] bg-surface-field px-3.5 py-3 text-center text-[14px] font-semibold tabular">
              {c.formula}
            </div>
            <Block label={a.labels.examples}>
              <span className="block text-text-secondary">{c.example1}</span>
              <span className="mt-1 block text-text-secondary">{c.example2}</span>
            </Block>
            <div className="border-t border-surface-hairline pt-3">
              <Block label={a.labels.improve} accent>
                {c.improve}
              </Block>
            </div>
            <Block label={a.labels.why}>{c.why}</Block>
          </section>
        );
      })}

      <h2 className="t-label px-1 text-text-tertiary">{a.tiersTitle}</h2>
      <div className="flex flex-col rounded-[var(--radius-card)] bg-surface-card px-4">
        {(["faible", "moyen", "bon", "excellent"] as const).map((k, i) => {
          const tier = a.tiers[k];
          const color =
            k === "faible"
              ? "text-semantic-out"
              : k === "excellent" || k === "bon"
                ? "text-semantic-in"
                : "text-text-secondary";
          return (
            <div
              key={k}
              className={`flex items-start gap-3 py-3 ${i < 3 ? "border-b border-surface-hairline" : ""}`}
            >
              <span className={`w-14 flex-none text-[13px] font-bold tabular ${color}`}>
                {tier.range}
              </span>
              <div className="flex flex-col">
                <span className="text-[14px] font-semibold">{tier.label}</span>
                <span className="t-secondary text-text-tertiary">{tier.blurb}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/statistiques"))}
        className="mt-2 flex h-[52px] items-center justify-center rounded-[var(--radius-pill)] border border-surface-rail bg-surface-card text-[15px] font-semibold text-brand-accent"
      >
        {a.back}
      </button>
    </NightScreen>
  );
}

function Block({
  label,
  accent = false,
  children,
}: {
  label: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`t-label ${accent ? "text-brand-accent" : "text-text-tertiary"}`}
      >
        {label}
      </span>
      <span className="text-[14px] leading-[1.5]">{children}</span>
    </div>
  );
}
