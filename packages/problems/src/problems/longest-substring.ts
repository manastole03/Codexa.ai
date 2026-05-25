import { mkProblem } from "./shared.js";

export const longestSubstring = mkProblem({
  slug: "longest-substring-without-repeating-characters",
  title: "Longest Substring Without Repeating Characters",
  difficulty: "MEDIUM",
  tags: ["Hash Table", "String", "Sliding Window"],
  summary: "Return the length of the longest substring with unique characters.",
  statement: "Given a string, print the maximum length of a contiguous substring that contains no repeated characters.",
  constraints: ["0 <= s.length <= 5 * 10^4"],
  examples: [{ input: "abcabcbb", output: "3" }, { input: "bbbbb", output: "1" }],
  hints: ["Maintain a window with no duplicates.", "Move the left side past the repeated character."],
  editorial: "Use a map from character to its latest index and slide the left pointer forward when a repeat appears.",
  solutions: {},
  tests: [
    { id: "longest-substring-1", input: "abcabcbb", expected: "3", hidden: false },
    { id: "longest-substring-2", input: "pwwkew", expected: "3", hidden: false },
    { id: "longest-substring-3", input: "", expected: "0", hidden: true }
  ]
});
