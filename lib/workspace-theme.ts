export const WORKSPACE_THEME_STORAGE_KEY = "arden24:workspace-theme";

export type WorkspaceThemeId = "arden" | "midnight" | "graphite" | "forest";

export const WORKSPACE_THEME_OPTIONS: {
  id: WorkspaceThemeId;
  label: string;
}[] = [
  { id: "arden", label: "Arden Blue" },
  { id: "midnight", label: "Midnight" },
  { id: "graphite", label: "Graphite" },
  { id: "forest", label: "Forest" },
];

export function isWorkspaceThemeId(v: string | null): v is WorkspaceThemeId {
  return (
    v === "arden" ||
    v === "midnight" ||
    v === "graphite" ||
    v === "forest"
  );
}
