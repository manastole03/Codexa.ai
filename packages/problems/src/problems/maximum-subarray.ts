import { mkProblem } from "./shared.js";

export const maximumSubarray = mkProblem({
  slug: "maximum-subarray",
  title: "Maximum Subarray",
  difficulty: "MEDIUM",
  tags: ["Array", "Dynamic Programming"],
  summary: "Find the largest sum of a contiguous subarray.",
  statement: "Given one line of integers, print the maximum possible sum of any non-empty contiguous subarray.",
  constraints: ["1 <= nums.length <= 10^5", "-10^4 <= nums[i] <= 10^4"],
  examples: [{ input: "-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "4 + -1 + 2 + 1 = 6." }],
  hints: ["Track the best subarray ending at the current index.", "Drop a prefix when it becomes worse than starting fresh."],
  editorial: "Kadane's algorithm updates current = max(x, current + x) and best = max(best, current).",
  solutions: {},
  tests: [
    { id: "maximum-subarray-1", input: "-2 1 -3 4 -1 2 1 -5 4", expected: "6", hidden: false },
    { id: "maximum-subarray-2", input: "1", expected: "1", hidden: false },
    { id: "maximum-subarray-3", input: "5 4 -1 7 8", expected: "23", hidden: true }
  ]
});
