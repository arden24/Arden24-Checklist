"use client";

/**
 * Shown on sign-in/sign-up when Supabase env vars are missing.
 * Keeps existing dark UI; provides exact env names and where to find them.
 */
export default function SupabaseConfigHelp() {
  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-200"
      role="alert"
    >
      <p className="font-semibold text-amber-100">
        Supabase is not configured
      </p>
      <p className="mt-2 text-amber-200/90">
        Add these to a file named <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs">.env.local</code> in your project root, then restart the dev server.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-black/40 p-3 font-mono text-xs leading-relaxed text-zinc-200">
        {`NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`}
      </pre>
      <p className="mt-3 text-amber-200/90">
        <strong className="text-amber-100">Where to find them:</strong> Supabase Dashboard → your project → <strong>Project Settings</strong> (gear) → <strong>API</strong>. Use <strong>Project URL</strong> and the <strong>anon</strong> public key.
      </p>
      <a
        href="https://supabase.com/dashboard/project/_/settings/api"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-xs font-medium text-sky-400 hover:text-sky-300 underline"
      >
        Open Supabase API settings →
      </a>
    </div>
  );
}
