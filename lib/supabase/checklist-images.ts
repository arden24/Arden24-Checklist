import type { SupabaseClient } from "@supabase/supabase-js";

export const CHECKLIST_IMAGES_BUCKET = "checklist-images" as const;
const CHECKLIST_IMAGE_REF_PREFIX = "sb-checklist:" as const;

export function makeChecklistImageRef(path: string): string {
  return `${CHECKLIST_IMAGE_REF_PREFIX}${path}`;
}

export function checklistImagePathFromRef(ref: string | undefined): string | null {
  if (!ref) return null;
  if (ref.startsWith(CHECKLIST_IMAGE_REF_PREFIX)) {
    return ref.slice(CHECKLIST_IMAGE_REF_PREFIX.length);
  }
  return null;
}

export function asChecklistImageRefIfPathLike(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith(CHECKLIST_IMAGE_REF_PREFIX)) return value;
  return null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadChecklistImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ imageRef: string; signedUrl: string }> {
  const path = `${userId}/${crypto.randomUUID()}-${sanitizeFileName(file.name || "image")}`;
  const { error: uploadError } = await supabase.storage
    .from(CHECKLIST_IMAGES_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || "image/png" });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase.storage
    .from(CHECKLIST_IMAGES_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (error) throw error;

  return { imageRef: makeChecklistImageRef(path), signedUrl: data.signedUrl };
}

export async function resolveChecklistImageRefs(
  supabase: SupabaseClient,
  refs: string[]
): Promise<Record<string, string>> {
  const pathsByRef = refs
    .map((ref) => ({ ref, path: checklistImagePathFromRef(ref) }))
    .filter((v): v is { ref: string; path: string } => Boolean(v.path));

  if (pathsByRef.length === 0) return {};
  const uniquePaths = [...new Set(pathsByRef.map((v) => v.path))];
  const { data, error } = await supabase.storage
    .from(CHECKLIST_IMAGES_BUCKET)
    .createSignedUrls(uniquePaths, 60 * 60 * 24 * 7);
  if (error) throw error;

  const signedByPath: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) signedByPath[row.path] = row.signedUrl;
  }

  const out: Record<string, string> = {};
  for (const { ref, path } of pathsByRef) {
    const signed = signedByPath[path];
    if (signed) out[ref] = signed;
  }
  return out;
}
