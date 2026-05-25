import "dotenv/config";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import type { Language, Submission } from "@codexa/types";
import { runTests } from "./runner.js";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

new Worker(
  "submissions",
  async (job): Promise<Submission> => {
    const started = Date.now();
    const { language, code, tests } = job.data as {
      language: Language;
      code: string;
      tests: Array<{ id: string; input: string; expected: string; hidden: boolean }>;
    };

    const result = await runTests({ language, code, tests });

    return {
      id: String(job.id),
      status: result.status,
      results: result.results,
      runtimeMs: Date.now() - started,
      createdAt: new Date().toISOString()
    };
  },
  { connection, concurrency: 2 }
);

console.log("Executor worker listening on BullMQ queue: submissions");
