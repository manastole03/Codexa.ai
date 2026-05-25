import { mkProblem } from "./shared.js";

export const numberOfIslands = mkProblem({
  slug: "number-of-islands",
  title: "Number of Islands",
  difficulty: "MEDIUM",
  tags: ["DFS", "BFS", "Matrix"],
  summary: "Count connected groups of land in a grid.",
  statement: "Input a grid of 0 and 1 characters, one row per line. Print the number of islands, where land connects vertically or horizontally.",
  constraints: ["1 <= rows, cols <= 300"],
  examples: [{ input: "11110\n11010\n11000\n00000", output: "1" }],
  hints: ["Scan every cell.", "When you find unvisited land, flood fill it and count one island."],
  editorial: "DFS or BFS visits each land cell once, marking connected land so it is not counted again.",
  solutions: {},
  tests: [
    { id: "number-of-islands-1", input: "11110\n11010\n11000\n00000", expected: "1", hidden: false },
    { id: "number-of-islands-2", input: "11000\n11000\n00100\n00011", expected: "3", hidden: false },
    { id: "number-of-islands-3", input: "0", expected: "0", hidden: true }
  ]
});
