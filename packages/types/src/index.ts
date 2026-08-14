import { z } from "zod";

export const productKindSchema = z.enum(["collaborative", "arena", "system-design"]);
export type ProductKind = z.infer<typeof productKindSchema>;

export const languageSchema = z.enum([
  "javascript",
  "typescript",
  "python",
  "cpp",
  "java",
  "go",
  "rust",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "dart"
]);
export type Language = z.infer<typeof languageSchema>;

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const languageCodeMapSchema = z
  .object({
    javascript: z.string().optional(),
    typescript: z.string().optional(),
    python: z.string().optional(),
    cpp: z.string().optional(),
    java: z.string().optional(),
    go: z.string().optional(),
    rust: z.string().optional(),
    csharp: z.string().optional(),
    ruby: z.string().optional(),
    php: z.string().optional(),
    swift: z.string().optional(),
    kotlin: z.string().optional(),
    dart: z.string().optional()
  })
  .strict();
export type LanguageCodeMap = z.infer<typeof languageCodeMapSchema>;

export const problemExampleSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string().optional()
});
export type ProblemExample = z.infer<typeof problemExampleSchema>;

export const testCaseSchema = z.object({
  id: z.string(),
  input: z.string(),
  expected: z.string(),
  hidden: z.boolean().default(false)
});
export type TestCase = z.infer<typeof testCaseSchema>;

export const problemSchema = z.object({
  slug: z.string(),
  title: z.string(),
  difficulty: difficultySchema,
  tags: z.array(z.string()),
  summary: z.string(),
  statement: z.string(),
  constraints: z.array(z.string()),
  examples: z.array(problemExampleSchema),
  hints: z.array(z.string()),
  editorial: z.string(),
  starters: languageCodeMapSchema,
  solutions: languageCodeMapSchema,
  tests: z.array(testCaseSchema)
});
export type Problem = z.infer<typeof problemSchema>;

export const roomCreateSchema = z.object({
  product: productKindSchema,
  name: z.string().min(1).max(80),
  language: languageSchema.default("javascript"),
  problemSlug: z.string().optional()
});
export type RoomCreateInput = z.infer<typeof roomCreateSchema>;

export const roomSchema = z.object({
  id: z.string(),
  product: productKindSchema,
  name: z.string(),
  language: languageSchema,
  problemSlug: z.string().optional(),
  createdAt: z.string()
});
export type Room = z.infer<typeof roomSchema>;

export const roomRoleSchema = z.enum(["admin", "user"]);
export type RoomRole = z.infer<typeof roomRoleSchema>;

export const activeRoomUserSchema = z.object({
  socketId: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  role: roomRoleSchema,
  joinedAt: z.string()
});
export type ActiveRoomUser = z.infer<typeof activeRoomUserSchema>;

export const collabFileMetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  language: languageSchema,
  order: z.number(),
  lockedBy: z.string().optional()
});
export type CollabFileMeta = z.infer<typeof collabFileMetaSchema>;

export const collabPresenceSchema = z.object({
  name: z.string(),
  color: z.string(),
  fileId: z.string().optional(),
  cursor: z
    .object({
      lineNumber: z.number(),
      column: z.number(),
      selectionEndLineNumber: z.number().optional(),
      selectionEndColumn: z.number().optional()
    })
    .optional()
});
export type CollabPresence = z.infer<typeof collabPresenceSchema>;

export const battlePhaseSchema = z.enum(["idle", "lobby", "countdown", "running", "ended"]);
export type BattlePhase = z.infer<typeof battlePhaseSchema>;

export const battleParticipantStatusSchema = z.enum([
  "joined",
  "coding",
  "running",
  "submitted",
  "disconnected"
]);
export type BattleParticipantStatus = z.infer<typeof battleParticipantStatusSchema>;

export const battleResultSchema = z.object({
  passed: z.number(),
  total: z.number(),
  status: z.string(),
  runtimeMs: z.number(),
  submittedAt: z.string()
});
export type BattleResult = z.infer<typeof battleResultSchema>;

export const battleParticipantSchema = z.object({
  socketId: z.string(),
  name: z.string(),
  role: roomRoleSchema,
  status: battleParticipantStatusSchema,
  result: battleResultSchema.optional()
});
export type BattleParticipant = z.infer<typeof battleParticipantSchema>;

export const battleStateSchema = z.object({
  phase: battlePhaseSchema,
  problemSlug: z.string().optional(),
  durationMs: z.number(),
  startedAt: z.number().optional(),
  endsAt: z.number().optional(),
  countdownEndsAt: z.number().optional(),
  participants: z.array(battleParticipantSchema),
  hostSocketId: z.string().optional(),
  revealCode: z.boolean().default(false)
});
export type BattleState = z.infer<typeof battleStateSchema>;

export const arenaRoomStateSchema = z.object({
  selectedProblemSlug: z.string().optional(),
  language: languageSchema.default("javascript")
});
export type ArenaRoomState = z.infer<typeof arenaRoomStateSchema>;

export const submissionStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "ACCEPTED",
  "WRONG_ANSWER",
  "RUNTIME_ERROR",
  "TIME_LIMIT_EXCEEDED",
  "MEMORY_LIMIT_EXCEEDED",
  "COMPILE_ERROR",
  "SYSTEM_ERROR"
]);
export type SubmissionStatus = z.infer<typeof submissionStatusSchema>;

export const runResultSchema = z.object({
  testCaseId: z.string(),
  status: submissionStatusSchema,
  stdout: z.string(),
  stderr: z.string(),
  expected: z.string(),
  runtimeMs: z.number(),
  memoryKb: z.number().optional()
});
export type RunResult = z.infer<typeof runResultSchema>;

export const submissionCreateSchema = z.object({
  product: productKindSchema,
  problemSlug: z.string().optional(),
  language: languageSchema,
  code: z.string().min(1),
  stdin: z.string().optional(),
  roomId: z.string().optional(),
  mode: z.enum(["run", "submit"]).default("run"),
  tests: z
    .array(
      z.object({
        id: z.string(),
        input: z.string(),
        expected: z.string(),
        hidden: z.boolean().optional()
      })
    )
    .optional()
});
export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;

export const submissionSchema = z.object({
  id: z.string(),
  status: submissionStatusSchema,
  results: z.array(runResultSchema),
  runtimeMs: z.number(),
  createdAt: z.string()
});
export type Submission = z.infer<typeof submissionSchema>;

export const mcpProblemResourceSchema = z.object({
  uri: z.string(),
  mimeType: z.literal("application/json"),
  text: z.string()
});
