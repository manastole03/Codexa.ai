import { mkProblem } from "./shared.js";

export const coinChange = mkProblem({
  slug: "coin-change",
  title: "Coin Change",
  difficulty: "MEDIUM",
  tags: ["Array", "Dynamic Programming", "BFS"],
  summary: "Find the fewest coins needed to make an amount.",
  statement: "First line contains coin denominations. Second line contains amount. Print the minimum number of coins, or -1 if impossible.",
  constraints: ["1 <= coins.length <= 12", "0 <= amount <= 10^4"],
  examples: [{ input: "1 2 5\n11", output: "3", explanation: "11 = 5 + 5 + 1." }],
  hints: ["Let dp[x] be the best answer for amount x.", "Try every coin for every amount."],
  editorial: "Initialize dp[0] = 0 and fill dp[a] = min(dp[a], dp[a - coin] + 1).",
  solutions: {},
  tests: [
    { id: "coin-change-1", input: "1 2 5\n11", expected: "3", hidden: false },
    { id: "coin-change-2", input: "2\n3", expected: "-1", hidden: false },
    { id: "coin-change-3", input: "1\n0", expected: "0", hidden: true }
  ]
});
