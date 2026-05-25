import Image from "next/image";
import { RoomWorkspace } from "@/components/room-workspace";

export default function RoomPage({
  params,
  searchParams
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ product?: "collaborative" | "arena"; name?: string; email?: string }>;
}) {
  return <RoomPageContent params={params} searchParams={searchParams} />;
}

async function RoomPageContent({
  params,
  searchParams
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ product?: "collaborative" | "arena"; name?: string; email?: string }>;
}) {
  const { roomId } = await params;
  const query = await searchParams;
  const product = query.product ?? "collaborative";
  const displayName = query.name ?? "";
  const email = query.email ?? "";

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
        </nav>
      </header>
      <RoomWorkspace roomId={roomId} product={product} displayName={displayName} email={email} />
    </main>
  );
}
