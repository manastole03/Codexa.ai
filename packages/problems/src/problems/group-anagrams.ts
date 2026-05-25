import { mkProblem } from "./shared.js";

export const groupAnagrams = mkProblem({
  slug: "group-anagrams",
  title: "Group Anagrams",
  difficulty: "MEDIUM",
  tags: ["Hash Table", "String", "Sorting"],
  summary: "Group words that are anagrams.",
  statement: "Given words separated by spaces, group anagrams. Print one group per line, with words in input order and groups ordered by first appearance.",
  constraints: ["1 <= words.length <= 10^4", "Words contain lowercase English letters."],
  examples: [{ input: "eat tea tan ate nat bat", output: "eat tea ate\ntan nat\nbat" }],
  hints: ["Use the sorted letters as a key.", "Keep insertion order for predictable output."],
  editorial: "Words with identical sorted-character keys are anagrams. Append each word to its key's group.",
  solutions: {},
  tests: [
    { id: "group-anagrams-1", input: "eat tea tan ate nat bat", expected: "eat tea ate\ntan nat\nbat", hidden: false },
    { id: "group-anagrams-2", input: "a", expected: "a", hidden: false },
    { id: "group-anagrams-3", input: "abc bca cab dog god", expected: "abc bca cab\ndog god", hidden: true }
  ]
});
