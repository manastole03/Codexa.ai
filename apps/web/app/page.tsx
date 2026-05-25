import Image from "next/image";
import { ProductSwitch, StatCard } from "@codexa/ui";
import { Activity, Boxes, Database, ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(25,211,218,0.18),transparent_30%),linear-gradient(135deg,#07080d_0%,#11151f_52%,#081316_100%)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5">
        <header className="flex h-14 items-center justify-between border-b border-white/10">
          <a href="/" className="flex items-center gap-3">
            <Image src="/codexa.png" width={34} height={34} alt="Codexa.ai" className="rounded-md" priority />
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Codexa.ai</span>
          </a>
          <nav className="hidden items-center gap-1 text-sm text-white/62 sm:flex">
            <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/dashboard">Dashboard</a>
            <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/leaderboard">Leaderboard</a>
          </nav>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70">
              <Activity size={14} className="text-signal-cyan" />
              Two products, one real-time coding stack
            </div>
            <h1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[1.02] text-white sm:text-6xl">
              Codexa.ai
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/64">
              Choose a focused collaborative workspace or a competitive LeetCode-style arena. Both run on the same Next.js, Socket.IO, Yjs, Prisma, Docker, Redis, and MCP foundation.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatCard label="Languages" value="13" icon={<Boxes size={17} />} />
              <StatCard label="Runtime" value="Docker" icon={<ShieldCheck size={17} />} />
              <StatCard label="Data" value="Prisma" icon={<Database size={17} />} />
            </div>
          </div>
          <ProductSwitch />
        </section>
      </div>
    </main>
  );
}
