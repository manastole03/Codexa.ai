"use client";

import type { ProductKind } from "@codexa/types";
import { motion } from "framer-motion";
import { Code2, Swords, UsersRound, Zap } from "lucide-react";
import { cn } from "./cn";

const products: Array<{
  kind: ProductKind;
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Code2;
  stats: string[];
}> = [
  {
    kind: "collaborative",
    title: "Collaborative Platform",
    subtitle: "Shared rooms, presence, chat, AI context, and real-time editing for project work.",
    href: "/collaborative",
    icon: UsersRound,
    stats: ["Yjs rooms", "Socket.IO sync", "AI-ready context"]
  },
  {
    kind: "arena",
    title: "LeetCode Arena",
    subtitle: "Problem sets, Monaco workspaces, submissions, executor jobs, leaderboard, and MCP tools.",
    href: "/arena",
    icon: Swords,
    stats: ["13 languages", "Docker executor", "MCP exposed"]
  }
];

export function ProductSwitch() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {products.map((product, index) => {
        const Icon = product.icon;
        return (
          <motion.a
            key={product.kind}
            href={product.href}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.45 }}
            className={cn(
              "group rounded-lg border border-white/10 bg-white/[0.045] p-5 text-left shadow-glow transition",
              "hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.075]"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="flex size-11 items-center justify-center rounded-md bg-white text-ink-950">
                <Icon size={22} />
              </span>
              <Zap className="text-signal-cyan opacity-70 transition group-hover:opacity-100" size={18} />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-white">{product.title}</h2>
            <p className="mt-3 min-h-16 text-sm leading-6 text-white/64">{product.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {product.stats.map((stat) => (
                <span key={stat} className="rounded-md border border-white/10 bg-ink-900 px-2.5 py-1 text-xs text-white/72">
                  {stat}
                </span>
              ))}
            </div>
          </motion.a>
        );
      })}
    </div>
  );
}
