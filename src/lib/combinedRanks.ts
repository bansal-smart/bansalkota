export type CombinedRankRow = {
  merge_key: string;
  rank_p1: number | null;
  rank_p2: number | null;
  rank_combined: number | null;
};

export type CombinedRank = { p1: number | null; p2: number | null; combined: number | null };

export function buildCombinedRankMap(rows: CombinedRankRow[] | null | undefined): Map<string, CombinedRank> {
  const map = new Map<string, CombinedRank>();
  (rows ?? []).forEach((r) => {
    map.set(r.merge_key, { p1: r.rank_p1, p2: r.rank_p2, combined: r.rank_combined });
  });
  return map;
}

export function rankText(value: number | null | undefined, fallback: string): string {
  return value === null || value === undefined ? fallback : String(value);
}
