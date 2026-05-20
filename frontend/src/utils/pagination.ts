export function getPageRange(page: number, totalPages: number, maxVisible = 5): number[] {
  if (totalPages <= 0) return [];
  if (maxVisible <= 0) maxVisible = 5;
  const half = Math.floor(maxVisible / 2);
  const start = Math.max(1, Math.min(page - half, totalPages - maxVisible + 1));
  const end = Math.min(totalPages, start + maxVisible - 1);
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
}