export function resolvePopularityCount(
  counts: Map<string, { count: number }>,
  manufacturer: string,
  model: string
): number {
  const key = `${manufacturer.toLowerCase()}|${model.toLowerCase()}`;
  return counts.get(key)?.count ?? 0;
}
