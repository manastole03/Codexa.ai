import Docker from "dockerode";
import type { Language, RunResult, SubmissionStatus, TestCase } from "@codexa/types";
import { languageRuntimes } from "./languages.js";

const docker = new Docker();
const wallTimeoutMs = Number(process.env.EXECUTOR_WALL_TIMEOUT_MS ?? 5000);
const memoryMb = Number(process.env.EXECUTOR_MEMORY_MB ?? 256);
const cpuCount = Number(process.env.EXECUTOR_CPU_COUNT ?? 1);

function normalize(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function splitDockerOutput(buffer: Buffer) {
  const chunks: Buffer[] = [];
  let offset = 0;

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    chunks.push(buffer.subarray(start, end));
    offset = end;
  }

  return Buffer.concat(chunks.length ? chunks : [buffer]).toString("utf8");
}

async function runContainer(language: Language, code: string, input: string) {
  const runtime = languageRuntimes[language];
  if (!runtime.executable) {
    return {
      stdout: "",
      stderr: `${language} execution is scaffolded. Build its Dockerfile and set executable: true in apps/executor/src/languages.ts.`,
      runtimeMs: 0,
      timedOut: false
    };
  }

  const codeB64 = Buffer.from(code).toString("base64");
  const inputB64 = Buffer.from(input).toString("base64");
  const command = [
    "sh",
    "-lc",
    [
      `printf '%s' '${codeB64}' | base64 -d > /work/${runtime.file}`,
      `printf '%s' '${inputB64}' | base64 -d > /work/input.txt`,
      `${runtime.run} < /work/input.txt`
    ].join(" && ")
  ];

  const started = Date.now();
  const container = await docker.createContainer({
    Image: runtime.image,
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
    OpenStdin: false,
    Tty: false,
    WorkingDir: "/work",
    User: "1000:1000",
    NetworkDisabled: true,
    HostConfig: {
      AutoRemove: true,
      NetworkMode: "none",
      ReadonlyRootfs: true,
      Memory: memoryMb * 1024 * 1024,
      NanoCpus: cpuCount * 1_000_000_000,
      PidsLimit: 64,
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
      Tmpfs: {
        "/work": "rw,nosuid,nodev,size=16m"
      }
    }
  });

  const stream = await container.attach({ stream: true, stdout: true, stderr: true });
  const chunks: Buffer[] = [];
  stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));

  await container.start();

  let timedOut = false;
  const timeout = setTimeout(async () => {
    timedOut = true;
    await container.kill().catch(() => undefined);
  }, wallTimeoutMs);

  const result = await container.wait().catch((error) => ({ StatusCode: 1, Error: error.message }));
  clearTimeout(timeout);

  const output = splitDockerOutput(Buffer.concat(chunks));
  const runtimeMs = Date.now() - started;
  const failed = "StatusCode" in result && result.StatusCode !== 0;

  return {
    stdout: failed ? "" : output,
    stderr: failed ? output || ("Error" in result ? String(result.Error) : "Runtime error") : "",
    runtimeMs,
    timedOut
  };
}

export async function runTests({
  language,
  code,
  tests
}: {
  language: Language;
  code: string;
  tests: TestCase[];
}): Promise<{ status: SubmissionStatus; results: RunResult[]; runtimeMs: number }> {
  const results: RunResult[] = [];

  for (const test of tests) {
    const result = await runContainer(language, code, test.input);
    const status: SubmissionStatus = result.timedOut
      ? "TIME_LIMIT_EXCEEDED"
      : result.stderr
        ? "RUNTIME_ERROR"
        : test.expected && normalize(result.stdout) !== normalize(test.expected)
          ? "WRONG_ANSWER"
          : "ACCEPTED";

    results.push({
      testCaseId: test.id,
      status,
      stdout: result.stdout,
      stderr: result.stderr,
      expected: test.expected,
      runtimeMs: result.runtimeMs
    });

    if (status !== "ACCEPTED") {
      break;
    }
  }

  const runtimeMs = results.reduce((sum, result) => sum + result.runtimeMs, 0);
  const status = results.every((result) => result.status === "ACCEPTED") ? "ACCEPTED" : results[results.length - 1]?.status ?? "SYSTEM_ERROR";

  return { status, results, runtimeMs };
}
