export function parseId(value: string | string[] | undefined): number {
  const normalized = Array.isArray(value) ? value[0] : value;
  return Number(normalized);
}
