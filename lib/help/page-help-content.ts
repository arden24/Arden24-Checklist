export type PageHelpKey =
  | "dashboard"
  | "strategies"
  | "checklist"
  | "live-trades"
  | "journal"
  | "notes"
  | "account"
  | "billing";

export type PageHelpContent = {
  /** Short label for the help button / modal chrome */
  modalTitle: string;
  /** What this page is for (plain prose) */
  purpose: string;
  /** How to use it (ordered steps) */
  howToUse: string[];
  /** Tips / best practice */
  tips: string[];
  /** Common mistakes to avoid */
  mistakes: string[];
};

export const PAGE_HELP_CONTENT: Record<PageHelpKey, PageHelpContent> = {
  dashboard: {
    modalTitle: "Dashboard help",
    purpose:
      "Your home base for a quick read on discipline and performance: closed-trade stats, open risk, and shortcuts into logging and review.",
    howToUse: [
      "Scan the summary cards for totals, net P/L, win rate, and how many trades are still open.",
      "Use the panels below to log new activity, review your strategy checklist, or jump into deeper stats when your plan allows.",
      "When you add or close trades elsewhere, return here to confirm numbers look right.",
    ],
    tips: [
      "Check the dashboard at a set time (end of session or week) so the story stays consistent.",
      "Treat the headline numbers as review signals, not a scorecard to chase.",
      "Pair stats with your written notes so you remember why trades happened.",
    ],
    mistakes: [
      "Refreshing obsessively after every tick — patterns emerge over many trades, not minutes.",
      "Ignoring open-trade count while only staring at win rate.",
      "Assuming a red day means the process failed — sometimes the setup never met your rules.",
    ],
  },
  strategies: {
    modalTitle: "Strategies help",
    purpose:
      "Build and maintain the playbooks you want to follow: setups, rules, and images that define what “valid” looks like for you.",
    howToUse: [
      "Start with “New strategy” and give each playbook a clear name you’ll recognise under pressure.",
      "Add the conditions you actually watch before entering — fewer, sharper rules beat long wish lists.",
      "Open a card to edit details; duplicate ideas by creating a new strategy instead of overwriting history.",
    ],
    tips: [
      "Write rules you can answer yes/no to in seconds at the desk.",
      "Snapshot charts or levels here so you are not guessing from memory later.",
      "Archive old versions by renaming (e.g. “v2 — London breakout”) instead of deleting if you still journal against them.",
    ],
    mistakes: [
      "Creating dozens of overlapping strategies — pick a small set you will really run the checklist against.",
      "Copy-pasting generic internet rules with no personal criteria.",
      "Editing a strategy mid-trade to justify an entry — change rules only when markets are closed and you are reviewing.",
    ],
  },
  checklist: {
    modalTitle: "Checklist help",
    purpose:
      "A pre-trade gate: score how many of your strategy conditions are present before you size or enter, with extra weight on critical checks.",
    howToUse: [
      "Pick the active strategy that matches the trade you are about to take.",
      "Tick each condition honestly; the weighted score shows how much of your playbook is aligned.",
      "Pay special attention to items marked critical — those are deal-breakers if unchecked.",
    ],
    tips: [
      "Run the checklist before you pull the trigger, not after you are already in.",
      "If the score is weak, the best trade is often no trade.",
      "Use screenshots when something unusual on the chart backs your read.",
    ],
    mistakes: [
      "Checking boxes to “make the score look good” — that breaks the whole tool.",
      "Skipping critical rows because you are in a hurry.",
      "Changing strategy mid-checklist to match the chart — pick one playbook per decision.",
    ],
  },
  "live-trades": {
    modalTitle: "Live Trades help",
    purpose:
      "Track positions that are still open and complete the journal when you exit: results, screenshots, and reflections feed your stats.",
    howToUse: [
      "Open trades land here automatically when you log them from the dashboard or checklist.",
      "When you close in the market, use the close form to record outcome, P/L, and notes.",
      "Remove duplicates only if you truly logged the same ticket twice — otherwise keep history intact.",
    ],
    tips: [
      "Update thoughts while the trade is fresh; you will not remember the nuance days later.",
      "Attach screenshots that show structure, not just green/red P/L.",
      "If your plan supports it, use ratings to spot patterns in execution quality.",
    ],
    mistakes: [
      "Closing the browser before saving the journal step — finish the form so stats stay accurate.",
      "Leaving ghost trades open forever — either close them properly or delete mistaken entries promptly.",
      "Mixing up currency symbols with your broker — align currency fields with how you measure risk.",
    ],
  },
  journal: {
    modalTitle: "Journal help",
    purpose:
      "Review closed trades and calendar performance: see what happened by day, learn from streaks, and connect outcomes to process.",
    howToUse: [
      "Move between months with the arrows or jump to Today.",
      "Open a day to inspect individual trades, edits, and notes you saved at close.",
      "Use summary tiles and deeper panels (when unlocked on your plan) to spot concentration in pairs or sessions.",
    ],
    tips: [
      "Journal for process first: did you follow the checklist and sizing plan?",
      "Look for repeating mistakes across weeks, not one-off lucky outcomes.",
      "Pair calendar reds with the notes you wrote — context beats hindsight.",
    ],
    mistakes: [
      "Only opening green days — losses carry the lessons.",
      "Deleting uncomfortable trades instead of tagging them as process errors.",
      "Treating journal stats as predictions — they describe history, not the future.",
    ],
  },
  notes: {
    modalTitle: "Notes help",
    purpose:
      "A structured scratchpad for plans, watchlists, lessons, and reminders so ideas do not live in scattered apps or chat threads.",
    howToUse: [
      "Pick a category tab that matches what you are capturing (plan, watchlist, lessons, etc.).",
      "Write short bullets you can scan before the session; save with the in-page save action when shown.",
      "Rotate categories as the week progresses — move rough ideas into Lessons when you review.",
    ],
    tips: [
      "Keep each section to one screen where possible — long essays rarely get re-read.",
      "Copy repeatable rules verbatim each week until they become habit.",
      "Tag emotional triggers (“FOMO after CPI”) so you recognise them faster next time.",
    ],
    mistakes: [
      "Using Notes as a trade log — keep executions in Live Trades / journal flows.",
      "Saving only headlines with no actionable next step.",
      "Assuming autosave without confirming your plan tier and save feedback.",
    ],
  },
  account: {
    modalTitle: "Account help",
    purpose:
      "Manage identity basics (email, password), workspace preferences, and see how your subscription tier lines up with features.",
    howToUse: [
      "Review your profile email — change it only when you can access the new inbox for verification.",
      "Use the password panel for routine rotation; pick unique passwords you do not reuse elsewhere.",
      "Adjust theme or workspace options if offered — keep contrast comfortable for long sessions.",
    ],
    tips: [
      "After email changes, sign out other devices if you share hardware.",
      "Keep billing management in the dedicated Billing page for Stripe portal links.",
      "Screenshot confirmation toasts if you are mid-travel and worried about connectivity.",
    ],
    mistakes: [
      "Changing email right before a trading session — you might need to reconfirm access.",
      "Reusing a weak password because it is easy to type under stress.",
      "Expecting subscription cancellation here — that is handled via Billing / Stripe customer portal.",
    ],
  },
  billing: {
    modalTitle: "Billing help",
    purpose:
      "Understand what Stripe reports for your subscription: status, renewal timing, plan name, and how to open the customer portal safely.",
    howToUse: [
      "Read the status line first — active, trialing, past_due, and cancelled each imply different access.",
      "Note the renewal or period-end date so you know when the next charge may occur.",
      "Use “Manage subscription” (or equivalent) to open Stripe’s hosted portal for card updates or cancellation.",
    ],
    tips: [
      "Update payment methods before cards expire to avoid accidental interruption.",
      "After upgrades or downgrades, wait a minute and refresh — webhooks can trail a few seconds.",
      "Download invoices from Stripe if you need them for records.",
    ],
    mistakes: [
      "Disputing charges in the bank before checking Stripe receipts — start with the portal history.",
      "Assuming cancellation deletes historical trade data immediately — check your data policies separately.",
      "Expecting instant feature flips during network issues — retry after refresh.",
    ],
  },
};

export function getPageHelpContent(key: PageHelpKey): PageHelpContent {
  return PAGE_HELP_CONTENT[key];
}
