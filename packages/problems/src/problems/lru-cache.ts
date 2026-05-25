import { mkProblem } from "./shared.js";

export const lruCache = mkProblem({
  slug: "lru-cache",
  title: "LRU Cache",
  difficulty: "HARD",
  tags: ["Hash Table", "Linked List", "Design"],
  summary: "Simulate a least-recently-used cache.",
  statement: "First line is capacity. Remaining lines are operations: put key value or get key. Print each get result on its own line.",
  constraints: ["1 <= capacity <= 3000", "1 <= operations.length <= 2 * 10^5"],
  examples: [{ input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2", output: "1\n-1" }],
  hints: ["A hash map gives O(1) lookup.", "A recency list lets you move touched items to the front."],
  editorial: "Combine a map with a doubly linked list, or use an ordered map abstraction where deleting and reinserting refreshes recency.",
  solutions: {},
  tests: [
    { id: "lru-cache-1", input: "2\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2", expected: "1\n-1", hidden: false },
    { id: "lru-cache-2", input: "1\nput 2 1\nget 2\nput 3 2\nget 2\nget 3", expected: "1\n-1\n2", hidden: false },
    { id: "lru-cache-3", input: "2\nget 9", expected: "-1", hidden: true }
  ]
});
