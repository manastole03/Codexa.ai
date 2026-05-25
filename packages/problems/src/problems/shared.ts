import type { Language, Problem } from "@codexa/types";

export const supportedLanguages: Language[] = [
  "javascript",
  "typescript",
  "python",
  "cpp",
  "java",
  "go",
  "rust",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "dart"
];

const starterByLanguage = {
  javascript: "function solve(input) {\n  return \"\";\n}\n\nconsole.log(solve(require('fs').readFileSync(0, 'utf8')));",
  typescript: "function solve(input: string): string {\n  return \"\";\n}\n\nconsole.log(solve(require('fs').readFileSync(0, 'utf8')));",
  python: "import sys\n\ndef solve(data: str) -> str:\n    return \"\"\n\nprint(solve(sys.stdin.read()))",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  return 0;\n}",
  java: "import java.io.*;\nimport java.util.*;\n\nclass Main {\n  public static void main(String[] args) throws Exception {\n  }\n}",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n  fmt.Println(\"\")\n}",
  rust: "use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n}",
  csharp: "using System;\n\npublic class Program {\n  public static void Main() {\n  }\n}",
  ruby: "input = STDIN.read\nputs \"\"",
  php: "<?php\n$input = stream_get_contents(STDIN);\necho \"\";\n",
  swift: "import Foundation\n\nlet input = String(data: FileHandle.standardInput.readDataToEndOfFile(), encoding: .utf8) ?? \"\"",
  kotlin: "fun main() {\n  val input = generateSequence(::readLine).joinToString(\"\\n\")\n}",
  dart: "import 'dart:io';\n\nvoid main() {\n  final input = stdin.readAsStringSync();\n}"
} satisfies Record<Language, string>;

export function mkProblem(problem: Omit<Problem, "starters"> & { starters?: Problem["starters"] }): Problem {
  return {
    starters: starterByLanguage,
    ...problem
  };
}
