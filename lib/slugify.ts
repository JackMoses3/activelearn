import { createHash } from "crypto";

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // strip non-alphanumeric (except space and -)
    .trim()
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse multiple hyphens
}

export function slugifyWithHash(name: string, existingSlugs: Set<string>): string {
  const base = slugify(name);
  if (!existingSlugs.has(base)) return base;
  const hash = createHash("sha256").update(name).digest("hex").slice(0, 4);
  return `${base}-${hash}`;
}
