import { coinChange } from "./problems/coin-change.js";
import { groupAnagrams } from "./problems/group-anagrams.js";
import { longestSubstring } from "./problems/longest-substring.js";
import { lruCache } from "./problems/lru-cache.js";
import { maximumSubarray } from "./problems/maximum-subarray.js";
import { medianTwoSortedArrays } from "./problems/median-two-sorted-arrays.js";
import { mergeIntervals } from "./problems/merge-intervals.js";
import { numberOfIslands } from "./problems/number-of-islands.js";
import { trappingRainWater } from "./problems/trapping-rain-water.js";
import { twoSum } from "./problems/two-sum.js";
import { validParentheses } from "./problems/valid-parentheses.js";
import { supportedLanguages } from "./problems/shared.js";

export const problems = [
  twoSum,
  validParentheses,
  mergeIntervals,
  maximumSubarray,
  groupAnagrams,
  longestSubstring,
  coinChange,
  numberOfIslands,
  lruCache,
  medianTwoSortedArrays,
  trappingRainWater
];

export { supportedLanguages };

export function getProblem(slug: string) {
  return problems.find((problem) => problem.slug === slug);
}

export function listProblems(filters?: { difficulty?: string; tag?: string; query?: string }) {
  const difficulty = filters?.difficulty?.toUpperCase();
  const tag = filters?.tag?.toLowerCase();
  const query = filters?.query?.toLowerCase();

  return problems.filter((problem) => {
    const byDifficulty = difficulty ? problem.difficulty === difficulty : true;
    const byTag = tag ? problem.tags.some((value: string) => value.toLowerCase() === tag) : true;
    const byQuery = query
      ? [problem.title, problem.summary, problem.statement, ...problem.tags].join(" ").toLowerCase().includes(query)
      : true;
    return byDifficulty && byTag && byQuery;
  });
}
