import Image from "next/image";
import { RoomLauncher } from "@/components/collaborative-launcher";
import { problems, supportedLanguages } from "@codexa/problems";
import { StatCard } from "@codexa/ui";
import { Container, RadioTower, Trophy } from "lucide-react";

export default function ArenaPage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-7xl px-5 py-5">
        <header className="flex h-14 items-center justify-between border-b border-white/10">
          <a href="/" className="flex items-center gap-3">
            <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">LeetCode Arena</span>
          </a>
          <a className="rounded-md px-3 py-2 text-sm text-white/62 hover:bg-white/10 hover:text-white" href="/collaborative">Collaborative Platform</a>
        </header>

        <section className="grid min-h-[calc(100vh-96px)] items-center gap-8 py-10 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-white">LeetCode Arena</h1>
            <p className="mt-4 text-base leading-7 text-white/62">
              Create or join a collaborative room first. Problems, shared code, active users, submissions, and MCP context live inside the room.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <StatCard label="Problems" value={String(problems.length)} icon={<Trophy size={17} />} />
              <StatCard label="Languages" value={String(supportedLanguages.length)} icon={<Container size={17} />} />
              <StatCard label="Realtime" value="Yjs" icon={<RadioTower size={17} />} />
            </div>
          </div>
          <RoomLauncher product="arena" title="Create or join an Arena room" />
        </section>
      </div>
    </main>
  );
}
