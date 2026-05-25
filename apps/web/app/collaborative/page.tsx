import Image from "next/image";
import { CollaborativeLauncher } from "@/components/collaborative-launcher";
import { StatCard } from "@codexa/ui";
import { BrainCircuit, MessageSquare, PanelsTopLeft } from "lucide-react";

export default function CollaborativePage() {
  return (
    <main className="min-h-screen bg-ink-950">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <header className="flex h-14 items-center justify-between border-b border-white/10">
          <a href="/" className="flex items-center gap-3">
            <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Collaborative Platform</span>
          </a>
          <a className="rounded-md px-3 py-2 text-sm text-white/62 hover:bg-white/10 hover:text-white" href="/arena">LeetCode Arena</a>
        </header>

        <section className="grid min-h-[calc(100vh-96px)] items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">Collaborative Platform</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/62">
              Real-time rooms for shared coding, chat, presence, AI context files, and handoff-ready project sessions.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <StatCard label="Rooms" value="Live" icon={<PanelsTopLeft size={17} />} />
              <StatCard label="Chat" value="Synced" icon={<MessageSquare size={17} />} />
              <StatCard label="AI" value="RAG" icon={<BrainCircuit size={17} />} />
            </div>
          </div>
          <CollaborativeLauncher />
        </section>
      </div>
    </main>
  );
}
