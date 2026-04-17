"use client";

import FeatureLockCard from "@/components/subscriptions/FeatureLockCard";
import { canUseEliteWorkspaceThemes } from "@/lib/subscriptions/tier-gates";
import { WORKSPACE_THEME_OPTIONS } from "@/lib/workspace-theme";
import { useWorkspaceTheme } from "@/components/workspace/WorkspaceThemeProvider";

export default function WorkspaceThemeSelector() {
  const { themeId, setThemeId, plan, planLoading } = useWorkspaceTheme();
  const elite = canUseEliteWorkspaceThemes(plan);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">Workspace appearance</h2>
      <p className="mt-1 text-sm text-zinc-400">
        Preset colour themes for the main workspace. Elite only — journaling and analysis
        tooling, not advice.
      </p>

      {planLoading ? (
        <p className="mt-4 text-sm text-zinc-500">Loading…</p>
      ) : !elite ? (
        <div className="mt-4">
          <FeatureLockCard
            requiredPlan="elite"
            title="Workspace themes"
            description="Unlock Arden Blue, Midnight, Graphite, and Forest presets to tune backgrounds, cards, and accents across the app."
          />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {WORKSPACE_THEME_OPTIONS.map((opt) => {
            const selected = themeId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setThemeId(opt.id)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? "border-sky-400/70 bg-sky-500/20 text-sky-100"
                    : "border-white/10 bg-black/30 text-zinc-300 hover:border-white/20"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
