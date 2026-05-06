export function slugifyIdSegment(value: string, fallback = "item") {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return (slug || fallback).slice(0, 12);
}

export function formatReadableId(prefix: string, label: string, index: number) {
  const slug = slugifyIdSegment(label, prefix);
  const sequence = String(index).padStart(3, "0");
  return `${prefix}-${slug}-${sequence}`;
}
