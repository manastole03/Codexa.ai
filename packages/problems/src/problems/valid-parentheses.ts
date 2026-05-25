import { mkProblem } from "./shared.js";

export const validParentheses = mkProblem({
  slug: "valid-parentheses",
  title: "Valid Parentheses",
  difficulty: "EASY",
  tags: ["Stack", "String"],
  summary: "Decide whether brackets close in a valid order.",
  statement: "Given a string containing only (), {}, and [], print true if every opening bracket is closed by the same type in the correct order; otherwise print false.",
  constraints: ["1 <= s.length <= 10^4", "s contains only bracket characters."],
  examples: [{ input: "()[]{}", output: "true" }, { input: "(]", output: "false" }],
  hints: ["Use a stack of opening brackets.", "A closing bracket must match the most recent opening bracket."],
  editorial: "Push opening brackets. For each closing bracket, pop and compare. The string is valid only if the stack is empty at the end.",
  solutions: {},
  tests: [
    { id: "valid-parentheses-1", input: "()[]{}", expected: "true", hidden: false },
    { id: "valid-parentheses-2", input: "([)]", expected: "false", hidden: false },
    { id: "valid-parentheses-3", input: "{[]}", expected: "true", hidden: true }
  ]
});
