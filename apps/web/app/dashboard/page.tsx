import Image from "next/image";
import { StatCard } from "@codexa/ui";
import { problems } from "@codexa/problems";
import { Award, Clock3, Code2, UsersRound } from "lucide-react";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-7xl px-5 py-5">
        <header className="flex h-14 items-center justify-between border-b border-white/10">
          <a href="/" className="flex items-center gap-3">
            <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Dashboard</span>
          </a>
        </header>
        <section className="py-8">
          <h1 className="text-3xl font-semibold text-white">Workspace Dashboard</h1>
          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <StatCard label="Problems" value={String(problems.length)} icon={<Code2 size={17} />} />
            <StatCard label="Rooms" value="0" icon={<UsersRound size={17} />} />
            <StatCard label="Recent" value="0" icon={<Clock3 size={17} />} />
            <StatCard label="Badges" value="0" icon={<Award size={17} />} />
          </div>
          <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <h2 className="text-lg font-semibold text-white">Recent Submissions</h2>
            <p className="mt-2 text-sm text-white/52">Submission history appears here after Postgres is seeded and the API is running.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
