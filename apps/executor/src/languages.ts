import type { Language } from "@codexa/types";

export type LanguageRuntime = {
  language: Language;
  image: string;
  file: string;
  run: string;
  executable: boolean;
};

export const languageRuntimes: Record<Language, LanguageRuntime> = {
  javascript: {
    language: "javascript",
    image: "codexa-executor-node:latest",
    file: "main.js",
    run: "node /work/main.js",
    executable: true
  },
  typescript: {
    language: "typescript",
    image: "codexa-executor-node:latest",
    file: "main.ts",
    run: "npx tsx /work/main.ts",
    executable: false
  },
  python: {
    language: "python",
    image: "codexa-executor-python:latest",
    file: "main.py",
    run: "python3 /work/main.py",
    executable: true
  },
  cpp: {
    language: "cpp",
    image: "codexa-executor-cpp:latest",
    file: "main.cpp",
    run: "g++ -std=c++20 -O2 -pipe -static -s /work/main.cpp -o /work/main && /work/main",
    executable: true
  },
  java: { language: "java", image: "codexa-executor-java:latest", file: "Main.java", run: "javac /work/Main.java && java -cp /work Main", executable: false },
  go: { language: "go", image: "codexa-executor-go:latest", file: "main.go", run: "go run /work/main.go", executable: false },
  rust: { language: "rust", image: "codexa-executor-rust:latest", file: "main.rs", run: "rustc /work/main.rs -o /work/main && /work/main", executable: false },
  csharp: { language: "csharp", image: "codexa-executor-csharp:latest", file: "Program.cs", run: "dotnet run --project /work", executable: false },
  ruby: { language: "ruby", image: "codexa-executor-ruby:latest", file: "main.rb", run: "ruby /work/main.rb", executable: false },
  php: { language: "php", image: "codexa-executor-php:latest", file: "main.php", run: "php /work/main.php", executable: false },
  swift: { language: "swift", image: "codexa-executor-swift:latest", file: "main.swift", run: "swift /work/main.swift", executable: false },
  kotlin: { language: "kotlin", image: "codexa-executor-kotlin:latest", file: "Main.kt", run: "kotlinc /work/Main.kt -include-runtime -d /work/main.jar && java -jar /work/main.jar", executable: false },
  dart: { language: "dart", image: "codexa-executor-dart:latest", file: "main.dart", run: "dart /work/main.dart", executable: false }
};
