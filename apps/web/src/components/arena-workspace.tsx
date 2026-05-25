"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Language, Problem, Submission } from "@codexa/types";
import { Button } from "@codexa/ui";
import { Play, Send } from "lucide-react";

const languageLabels: Array<{ value: Language; label: string }> = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "dart", label: "Dart" }
];

function markdownFor(problem: Problem) {
  return `${problem.statement}\n\n## Examples\n${problem.examples
    .map((example) => `Input:\n\`\`\`\n${example.input}\n\`\`\`\nOutput:\n\`\`\`\n${example.output}\n\`\`\``)
    .join("\n\n")}\n\n## Constraints\n${problem.constraints.map((constraint) => `- ${constraint}`).join("\n")}`;
}

export function ArenaWorkspace({ problem }: { problem: Problem }) {
  const [language, setLanguage] = useState<Language>("javascript");
  const [code, setCode] = useState(problem.starters.javascript ?? "");
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);

  function selectLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setCode(problem.starters[nextLanguage] ?? "");
  }

  async function submit(mode: "run" | "submit") {
    setRunning(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "arena",
          problemSlug: problem.slug,
          language,
          code,
          mode
        })
      });
      setSubmission(await response.json());
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="workspace-grid">
      <aside className="overflow-auto border-r border-white/10 bg-ink-950/72 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <a href="/arena" className="text-sm text-signal-cyan">Problems</a>
            <h1 className="mt-3 text-2xl font-semibold text-white">{problem.title}</h1>
          </div>
          <span className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/70">
            {problem.difficulty}
          </span>
        </div>
        <div className="prose prose-invert mt-6 max-w-none prose-pre:border prose-pre:border-white/10 prose-pre:bg-ink-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownFor(problem)}</ReactMarkdown>
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-72px)] flex-col bg-[#0b0d13]">
        <div className="grid gap-3 border-b border-white/10 p-3 sm:grid-cols-[220px_1fr_auto_auto]">
          <select
            className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm outline-none focus:border-signal-cyan"
            value={language}
            onChange={(event) => selectLanguage(event.target.value as Language)}
            aria-label="Language"
          >
            {languageLabels.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <div />
          <Button type="button" variant="secondary" icon={<Play size={16} />} disabled={running} onClick={() => submit("run")}>Run</Button>
          <Button type="button" icon={<Send size={16} />} disabled={running} onClick={() => submit("submit")}>Submit</Button>
        </div>
        <div className="min-h-[440px] flex-1">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            theme="vs-dark"
            value={code}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontLigatures: true,
              scrollBeyondLastLine: false,
              padding: { top: 18 }
            }}
            onChange={(value) => setCode(value ?? "")}
          />
        </div>
        <div className="border-t border-white/10 bg-ink-950 p-4">
          <div className="text-sm font-semibold text-white">Results</div>
          {!submission && <div className="mt-2 text-sm text-white/46">No submission yet.</div>}
          {submission && (
            <div className="mt-3 grid gap-2">
              <div className="text-sm text-white/72">{submission.status} in {submission.runtimeMs}ms</div>
              {submission.results.map((result) => (
                <div key={result.testCaseId} className="rounded-md border border-white/10 bg-white/[0.04] p-3 font-mono text-xs text-white/68">
                  <div>{result.testCaseId}: {result.status}</div>
                  {result.stderr && <pre className="mt-2 whitespace-pre-wrap text-signal-rose">{result.stderr}</pre>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
