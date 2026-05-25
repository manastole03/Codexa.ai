import { mkProblem } from "./shared.js";

export const mergeIntervals = mkProblem({
  slug: "merge-intervals",
  title: "Merge Intervals",
  difficulty: "MEDIUM",
  tags: ["Array", "Sorting"],
  summary: "Merge all overlapping intervals.",
  statement: "Input intervals as one interval per line, formatted start end. Print merged intervals as start end lines sorted by start.",
  constraints: ["1 <= intervals.length <= 10^4", "0 <= start <= end <= 10^9"],
  examples: [{ input: "1 3\n2 6\n8 10\n15 18", output: "1 6\n8 10\n15 18" }],
  hints: ["Sort by start time first.", "Merge into the last interval when ranges overlap."],
  editorial: "After sorting, keep a result stack. If the next interval starts before the current end, extend the end; otherwise append a new interval.",
  solutions: {},
  tests: [
    { id: "merge-intervals-1", input: "1 3\n2 6\n8 10\n15 18", expected: "1 6\n8 10\n15 18", hidden: false },
    { id: "merge-intervals-2", input: "1 4\n4 5", expected: "1 5", hidden: false },
    { id: "merge-intervals-3", input: "1 2\n3 4", expected: "1 2\n3 4", hidden: true }
  ]
});
