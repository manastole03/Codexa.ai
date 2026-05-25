import { mkProblem } from "./shared.js";

export const twoSum = mkProblem({
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "EASY",
  tags: ["Array", "Hash Table"],
  summary: "Return the indices of two numbers that add up to the target.",
  statement: "Given an integer array nums and an integer target, return the indices of the two numbers such that they add up to target. Input format: first line numbers, second line target. Output a JSON-style pair like [0,1].",
  constraints: ["2 <= nums.length <= 10^4", "-10^9 <= nums[i], target <= 10^9", "Exactly one valid answer may exist."],
  examples: [{ input: "2 7 11 15\n9", output: "[0,1]", explanation: "nums[0] + nums[1] = 9." }],
  hints: ["Track numbers you have already seen.", "For each value, look for target - value."],
  editorial: "Use a hash map from value to index. Scan once and return as soon as the complement is known.",
  solutions: {
    javascript: "const input = require('fs').readFileSync(0, 'utf8').trim().split(/\\n/);\nconst nums = input[0].trim().split(/\\s+/).map(Number);\nconst target = Number(input[1]);\nconst seen = new Map();\nfor (let i = 0; i < nums.length; i++) {\n  const need = target - nums[i];\n  if (seen.has(need)) {\n    console.log(`[${seen.get(need)},${i}]`);\n    process.exit(0);\n  }\n  seen.set(nums[i], i);\n}\nconsole.log('[]');",
    python: "import sys\nlines = sys.stdin.read().strip().splitlines()\nnums = list(map(int, lines[0].split()))\ntarget = int(lines[1])\nseen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen:\n        print(f'[{seen[target-x]},{i}]')\n        break\n    seen[x] = i"
  },
  tests: [
    { id: "two-sum-1", input: "2 7 11 15\n9", expected: "[0,1]", hidden: false },
    { id: "two-sum-2", input: "3 2 4\n6", expected: "[1,2]", hidden: false },
    { id: "two-sum-3", input: "-3 4 3 90\n0", expected: "[0,2]", hidden: true }
  ]
});
