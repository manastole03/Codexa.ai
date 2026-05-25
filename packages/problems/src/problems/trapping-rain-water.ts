import { mkProblem } from "./shared.js";

export const trappingRainWater = mkProblem({
  slug: "trapping-rain-water",
  title: "Trapping Rain Water",
  difficulty: "HARD",
  tags: ["Array", "Two Pointers", "Dynamic Programming"],
  summary: "Compute how much water is trapped between bars.",
  statement: "Given one line of non-negative bar heights, print the total trapped water.",
  constraints: ["1 <= height.length <= 2 * 10^4", "0 <= height[i] <= 10^5"],
  examples: [{ input: "0 1 0 2 1 0 1 3 2 1 2 1", output: "6" }],
  hints: ["Water at a position depends on the max wall to its left and right.", "Two pointers can track those maxima in one pass."],
  editorial: "Move the side with the lower current wall, updating that side's max and accumulating max - height.",
  solutions: {},
  tests: [
    { id: "trapping-rain-water-1", input: "0 1 0 2 1 0 1 3 2 1 2 1", expected: "6", hidden: false },
    { id: "trapping-rain-water-2", input: "4 2 0 3 2 5", expected: "9", hidden: false },
    { id: "trapping-rain-water-3", input: "1 2 3", expected: "0", hidden: true }
  ]
});
