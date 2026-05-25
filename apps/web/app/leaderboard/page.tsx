import Image from "next/image";
import { Trophy } from "lucide-react";

const seededRows = [
  { rank: 1, name: "Demo Arena User", solved: 0, runtime: "-" },
  { rank: 2, name: "Collaborator", solved: 0, runtime: "-" },
  { rank: 3, name: "Guest", solved: 0, runtime: "-" }
];

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-5xl px-5 py-5">
        <header className="flex h-14 items-center justify-between border-b border-white/10">
          <a href="/" className="flex items-center gap-3">
            <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Leaderboard</span>
          </a>
        </header>
        <section className="py-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-white text-ink-950">
              <Trophy size={20} />
            </span>
            <h1 className="text-3xl font-semibold text-white">Arena Leaderboard</h1>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.06] text-white/56">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Solved</th>
                  <th className="px-4 py-3">Fastest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {seededRows.map((row) => (
                  <tr key={row.rank}>
                    <td className="px-4 py-3 text-white/68">{row.rank}</td>
                    <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                    <td className="px-4 py-3 text-white/68">{row.solved}</td>
                    <td className="px-4 py-3 text-white/68">{row.runtime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
