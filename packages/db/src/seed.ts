import bcrypt from "bcryptjs";
import { problems } from "@codexa/problems";
import type { Language as PrismaLanguage } from "@prisma/client";
import { prisma } from "./client";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  await prisma.user.upsert({
    where: { email: "demo@arena.dev" },
    update: { passwordHash },
    create: {
      email: "demo@arena.dev",
      name: "Demo Arena User",
      passwordHash
    }
  });

  for (const problem of problems) {
    const saved = await prisma.problem.upsert({
      where: { slug: problem.slug },
      update: {
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags,
        summary: problem.summary,
        statement: problem.statement,
        constraints: problem.constraints,
        hints: problem.hints,
        editorial: problem.editorial
      },
      create: {
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags,
        summary: problem.summary,
        statement: problem.statement,
        constraints: problem.constraints,
        hints: problem.hints,
        editorial: problem.editorial
      }
    });

    await prisma.$transaction([
      prisma.problemExample.deleteMany({ where: { problemId: saved.id } }),
      prisma.testCase.deleteMany({ where: { problemId: saved.id } }),
      prisma.starterCode.deleteMany({ where: { problemId: saved.id } }),
      prisma.referenceSolution.deleteMany({ where: { problemId: saved.id } })
    ]);

    await prisma.problemExample.createMany({
      data: problem.examples.map((example, order) => ({
        problemId: saved.id,
        order,
        input: example.input,
        output: example.output,
        explanation: example.explanation
      }))
    });

    await prisma.testCase.createMany({
      data: problem.tests.map((test) => ({
        problemId: saved.id,
        externalId: test.id,
        input: test.input,
        expected: test.expected,
        hidden: test.hidden
      }))
    });

    await prisma.starterCode.createMany({
      data: Object.entries(problem.starters).flatMap(([language, code]) =>
        code
          ? [
              {
                problemId: saved.id,
                language: language.toUpperCase() as PrismaLanguage,
                code
              }
            ]
          : []
      )
    });

    await prisma.referenceSolution.createMany({
      data: Object.entries(problem.solutions).flatMap(([language, code]) =>
        code
          ? [
              {
                problemId: saved.id,
                language: language.toUpperCase() as PrismaLanguage,
                code
              }
            ]
          : []
      )
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
