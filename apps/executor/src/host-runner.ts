import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Language } from "@codexa/types";

type HostMeta = {
  file: string;
  command: string;
  args: (codePath: string, workDir: string) => string[];
  prepare?: (workDir: string) => Promise<void>;
};

// Languages we can run by spawning a host process directly.
// Limited to interpreters/compilers commonly present on developer machines.
const hostRuntimes: Partial<Record<Language, HostMeta>> = {
  javascript: {
    file: "main.js",
    command: process.execPath,
    args: (codePath) => [codePath]
  },
  python: {
    file: "main.py",
    command: process.env.PYTHON_BIN ?? "python3",
    args: (codePath) => [codePath]
  }
};

export function hostModeSupports(language: Language) {
  return Boolean(hostRuntimes[language]);
}

const wallTimeoutMs = Number(process.env.EXECUTOR_WALL_TIMEOUT_MS ?? 5000);
const maxOutputBytes = 256 * 1024;

export async function runHostMode(
  language: Language,
  code: string,
  input: string
): Promise<{ stdout: string; stderr: string; runtimeMs: number; timedOut: boolean; mode: "host" }> {
  const meta = hostRuntimes[language];
  if (!meta) {
    return {
      stdout: "",
      stderr: `Host mode not available for ${language}. Run \`pnpm docker:build-execs\` to enable the Docker sandbox.`,
      runtimeMs: 0,
      timedOut: false,
      mode: "host"
    };
  }

  const workDir = await mkdtemp(join(tmpdir(), "codexa-exec-"));
  try {
    const codePath = join(workDir, meta.file);
    await writeFile(codePath, code, { encoding: "utf8" });

    const started = Date.now();
    const proc = spawn(meta.command, meta.args(codePath, workDir), {
      cwd: workDir,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        // Strip parent env to reduce blast radius; keep just enough to run.
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        LANG: process.env.LANG ?? "en_US.UTF-8",
        NODE_OPTIONS: ""
      }
    });

    let stdout = "";
    let stderr = "";
    let truncated = false;

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      if (stdout.length < maxOutputBytes) stdout += chunk;
      else truncated = true;
    });
    proc.stderr.on("data", (chunk) => {
      if (stderr.length < maxOutputBytes) stderr += chunk;
      else truncated = true;
    });

    try {
      proc.stdin.write(input);
      proc.stdin.end();
    } catch {
      // ignore EPIPE if the process exited before we could write
    }

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, wallTimeoutMs);

    const exitCode: number = await new Promise((resolve) => {
      proc.on("close", (code) => resolve(typeof code === "number" ? code : 1));
      proc.on("error", () => resolve(1));
    });
    clearTimeout(timer);

    if (truncated) stderr += "\n[output truncated]";
    if (exitCode !== 0 && !stderr) stderr = `exited with code ${exitCode}`;

    return {
      stdout: exitCode === 0 || timedOut ? stdout : "",
      stderr: exitCode !== 0 ? stderr || `exit ${exitCode}` : "",
      runtimeMs: Date.now() - started,
      timedOut,
      mode: "host"
    };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
