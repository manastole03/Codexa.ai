import Docker from "dockerode";
import type { Language, RunResult, SubmissionStatus, TestCase } from "@codexa/types";
import { languageRuntimes } from "./languages.js";
import { hostModeSupports, runHostMode } from "./host-runner.js";

const docker = new Docker();
const wallTimeoutMs = Number(process.env.EXECUTOR_WALL_TIMEOUT_MS ?? 5000);
const memoryMb = Number(process.env.EXECUTOR_MEMORY_MB ?? 256);
const cpuCount = Number(process.env.EXECUTOR_CPU_COUNT ?? 1);
const allowHostFallback = process.env.EXECUTOR_DISABLE_HOST_FALLBACK !== "true";

let dockerReady: boolean | null = null;
async function dockerAvailable() {
  if (dockerReady !== null) return dockerReady;
  try {
    await docker.ping();
    dockerReady = true;
  } catch {
    dockerReady = false;
    console.warn("[executor] Docker is not reachable — falling back to host-mode runner (JS/Python only). Run `pnpm docker:build-execs` and ensure Docker Desktop is running for sandboxed execution.");
  }
  return dockerReady;
}

async function dockerImageExists(image: string) {
  try {
    await docker.getImage(image).inspect();
    return true;
  } catch {
    return false;
  }
}

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

async function runViaDocker(language: Language, code: string, input: string) {
  const runtime = languageRuntimes[language];
  if (!runtime.executable) {
    throw new Error(`Docker image for ${language} is not configured`);
  }
  const imageOk = await dockerImageExists(runtime.image);
  if (!imageOk) {
    throw new Error(`Docker image '${runtime.image}' not found. Run \`pnpm docker:build-execs\`.`);
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
    timedOut,
    mode: "docker" as const
  };
}

async function runContainer(language: Language, code: string, input: string) {
  if (await dockerAvailable()) {
    try {
      return await runViaDocker(language, code, input);
    } catch (error) {
      if (!allowHostFallback || !hostModeSupports(language)) {
        return {
          stdout: "",
          stderr: error instanceof Error ? error.message : "Docker execution failed",
          runtimeMs: 0,
          timedOut: false,
          mode: "docker" as const
        };
      }
    }
  }

  if (allowHostFallback && hostModeSupports(language)) {
    return runHostMode(language, code, input);
  }

  return {
    stdout: "",
    stderr: `Execution unavailable for ${language}. Docker images are not built and host fallback is disabled.`,
    runtimeMs: 0,
    timedOut: false,
    mode: "docker" as const
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

  if (tests.length === 0) {
    return { status: "SYSTEM_ERROR", results: [], runtimeMs: 0 };
  }

  for (const test of tests) {
    let result: { stdout: string; stderr: string; runtimeMs: number; timedOut: boolean };
    try {
      result = await runContainer(language, code, test.input);
    } catch (error) {
      result = {
        stdout: "",
        stderr: error instanceof Error ? error.message : "Execution failed",
        runtimeMs: 0,
        timedOut: false
      };
    }

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
  }

  const runtimeMs = results.reduce((sum, r) => sum + r.runtimeMs, 0);
  const overall: SubmissionStatus = results.every((r) => r.status === "ACCEPTED")
    ? "ACCEPTED"
    : results.find((r) => r.status === "RUNTIME_ERROR")?.status ??
      results.find((r) => r.status === "TIME_LIMIT_EXCEEDED")?.status ??
      results.find((r) => r.status === "WRONG_ANSWER")?.status ??
      "SYSTEM_ERROR";

  return { status: overall, results, runtimeMs };
}
