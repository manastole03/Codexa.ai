import { mkProblem } from "./shared.js";

export const medianTwoSortedArrays = mkProblem({
  slug: "median-of-two-sorted-arrays",
  title: "Median of Two Sorted Arrays",
  difficulty: "HARD",
  tags: ["Array", "Binary Search", "Divide and Conquer"],
  summary: "Find the median across two sorted arrays.",
  statement: "The first two lines contain sorted integer arrays. Print the median as an integer or decimal.",
  constraints: ["0 <= m, n <= 1000", "1 <= m + n", "Arrays are sorted."],
  examples: [{ input: "1 3\n2", output: "2" }, { input: "1 2\n3 4", output: "2.5" }],
  hints: ["A merge is acceptable for the seed tests.", "For the optimal version, partition the smaller array."],
  editorial: "The optimal O(log(min(m,n))) approach binary-searches a partition where left-side values are <= right-side values.",
  solutions: {},
  tests: [
    { id: "median-two-sorted-arrays-1", input: "1 3\n2", expected: "2", hidden: false },
    { id: "median-two-sorted-arrays-2", input: "1 2\n3 4", expected: "2.5", hidden: false },
    { id: "median-two-sorted-arrays-3", input: "0 0\n0 0", expected: "0", hidden: true }
  ]
});
