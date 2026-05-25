"use client";

import { useMemo, useState } from "react";
import type { Problem } from "@codexa/types";

export function ProblemBrowser({ problems }: { problems: Problem[] }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return problems.filter((problem) => {
      const matchesQuery = needle
        ? [problem.title, problem.summary, ...problem.tags].join(" ").toLowerCase().includes(needle)
        : true;
      const matchesDifficulty = difficulty ? problem.difficulty === difficulty : true;
      return matchesQuery && matchesDifficulty;
    });
  }, [difficulty, problems, query]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04]">
      <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[1fr_180px]">
        <input
          className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm outline-none placeholder:text-white/32 focus:border-signal-cyan"
          placeholder="Search problems or tags"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="h-10 rounded-md border border-white/10 bg-ink-950 px-3 text-sm outline-none focus:border-signal-cyan"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
          aria-label="Difficulty"
        >
          <option value="">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>
      <div className="divide-y divide-white/10">
        {filtered.map((problem) => (
          <a key={problem.slug} href={`/problems/${problem.slug}`} className="grid gap-3 p-4 transition hover:bg-white/[0.06] md:grid-cols-[1fr_120px]">
            <div>
              <div className="text-base font-semibold text-white">{problem.title}</div>
              <div className="mt-1 text-sm leading-6 text-white/58">{problem.summary}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {problem.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-white/10 px-2 py-1 text-xs text-white/58">{tag}</span>
                ))}
              </div>
            </div>
            <div className="text-sm font-semibold text-white/70">{problem.difficulty}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
