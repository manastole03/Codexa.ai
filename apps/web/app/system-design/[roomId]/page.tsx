import Image from "next/image";
import { SystemDesignWorkspace } from "@/components/system-design-workspace";

export default async function SystemDesignRoomPage({
  params,
  searchParams
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ name?: string; email?: string }>;
}) {
  const { roomId } = await params;
  const query = await searchParams;

  return (
    <main className="min-h-screen bg-ink-950">
      <header className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
        <a href="/" className="flex items-center gap-3">
          <Image src="/codexa.png" width={32} height={32} alt="Codexa.ai" className="rounded-md" />
          <span className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Codexa.ai</span>
        </a>
        <nav className="flex items-center gap-1 text-sm text-white/62">
          <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/collaborative">Collaborative</a>
          <a className="rounded-md px-3 py-2 hover:bg-white/10 hover:text-white" href="/arena">Arena</a>
          <a className="rounded-md px-3 py-2 text-emerald-300 hover:bg-white/10" href="/system-design">System Design</a>
        </nav>
      </header>
      <SystemDesignWorkspace
        roomId={roomId}
        displayName={query.name ?? ""}
        email={query.email ?? ""}
      />
    </main>
  );
}
