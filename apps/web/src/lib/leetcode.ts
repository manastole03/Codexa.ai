import type { Problem } from "@codexa/types";
import { apiBaseUrl } from "@/lib/api";

export type LeetcodeListEntry = {
  slug: string;
  frontendId: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  url: string;
  hasSolution?: boolean;
};

export type LeetcodeProblem = Problem & {
  source?: "leetcode" | "curated";
  url?: string;
  frontendId?: string;
};

const listCache: { data: LeetcodeListEntry[] | null; fetchedAt: number; pending?: Promise<LeetcodeListEntry[]> } = {
  data: null,
  fetchedAt: 0
};

const detailCache = new Map<string, LeetcodeProblem>();
const pendingDetail = new Map<string, Promise<LeetcodeProblem | null>>();

export async function fetchLeetcodeList(): Promise<LeetcodeListEntry[]> {
  if (listCache.data && Date.now() - listCache.fetchedAt < 60 * 60 * 1000) return listCache.data;
  if (listCache.pending) return listCache.pending;
  listCache.pending = (async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/arena/leetcode/problems`);
      const payload = (await res.json()) as { problems?: LeetcodeListEntry[] };
      listCache.data = payload.problems ?? [];
      listCache.fetchedAt = Date.now();
      return listCache.data;
    } finally {
      listCache.pending = undefined;
    }
  })();
  return listCache.pending;
}

export async function fetchLeetcodeProblem(slug: string): Promise<LeetcodeProblem | null> {
  if (detailCache.has(slug)) return detailCache.get(slug)!;
  const pending = pendingDetail.get(slug);
  if (pending) return pending;
  const promise = (async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/arena/leetcode/problem/${encodeURIComponent(slug)}`);
      if (!res.ok) return null;
      const payload = (await res.json()) as { problem?: LeetcodeProblem };
      if (!payload.problem) return null;
      detailCache.set(slug, payload.problem);
      return payload.problem;
    } finally {
      pendingDetail.delete(slug);
    }
  })();
  pendingDetail.set(slug, promise);
  return promise;
}

export function getCachedLeetcodeProblem(slug: string) {
  return detailCache.get(slug) ?? null;
}
