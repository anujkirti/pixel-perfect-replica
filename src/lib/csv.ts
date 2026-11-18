export function toCsv(rows: Record<string, unknown>[]) {
  const headers = Object.keys(rows[0] ?? {});
  const quote = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return [
    headers.map(quote).join(","),
    ...rows.map((r) => headers.map((h) => quote(r[h])).join(",")),
  ].join("\r\n");
}
