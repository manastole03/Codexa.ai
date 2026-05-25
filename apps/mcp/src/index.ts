import cors from "cors";
import express from "express";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { getProblem, listProblems } from "@codexa/problems";

const server = new McpServer({
  name: "codexa-leetcode-arena",
  version: "1.0.0"
});

server.tool("list_products", {}, async () => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(
        [
          { key: "collaborative", name: "Collaborative Platform" },
          { key: "arena", name: "LeetCode Arena" }
        ],
        null,
        2
      )
    }
  ]
}));

server.tool(
  "list_problems",
  {
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    tag: z.string().optional(),
    query: z.string().optional()
  },
  async ({ difficulty, tag, query }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(listProblems({ difficulty, tag, query }), null, 2)
      }
    ]
  })
);

server.tool(
  "get_problem",
  {
    slug: z.string()
  },
  async ({ slug }) => {
    const problem = getProblem(slug);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(problem ?? { error: "Problem not found" }, null, 2)
        }
      ]
    };
  }
);

server.tool(
  "get_solution",
  {
    slug: z.string(),
    language: z.string()
  },
  async ({ slug, language }) => {
    const problem = getProblem(slug);
    const solution = problem?.solutions[language as keyof typeof problem.solutions];
    return {
      content: [
        {
          type: "text",
          text: solution ?? "No reference solution is available for that language yet."
        }
      ]
    };
  }
);

server.tool(
  "get_editorial",
  {
    slug: z.string()
  },
  async ({ slug }) => ({
    content: [
      {
        type: "text",
        text: getProblem(slug)?.editorial ?? "Problem not found."
      }
    ]
  })
);

server.tool(
  "get_hints",
  {
    slug: z.string()
  },
  async ({ slug }) => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(getProblem(slug)?.hints ?? [], null, 2)
      }
    ]
  })
);

server.tool(
  "validate_solution",
  {
    slug: z.string(),
    language: z.string(),
    code: z.string()
  },
  async ({ slug, language, code }) => {
    const apiUrl = process.env.API_URL ?? "http://localhost:4000";
    const response = await fetch(`${apiUrl}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "arena",
        mode: "submit",
        problemSlug: slug,
        language,
        code
      })
    });
    const payload = await response.json();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2)
        }
      ]
    };
  }
);

server.resource("problem", new ResourceTemplate("problem://{slug}", { list: undefined }), async (uri, { slug }) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(getProblem(String(slug)) ?? { error: "Problem not found" }, null, 2)
    }
  ]
}));

server.resource("solution", new ResourceTemplate("solution://{slug}/{language}", { list: undefined }), async (uri, { slug, language }) => {
  const problem = getProblem(String(slug));
  const solution = problem?.solutions[String(language) as keyof typeof problem.solutions] ?? "";
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "text/plain",
        text: solution || "No reference solution is available for that language yet."
      }
    ]
  };
});

server.resource("editorial", new ResourceTemplate("editorial://{slug}", { list: undefined }), async (uri, { slug }) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "text/markdown",
      text: getProblem(String(slug))?.editorial ?? "Problem not found."
    }
  ]
}));

if (process.env.MCP_TRANSPORT === "http") {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  app.post("/", async (request, response) => {
    await transport.handleRequest(request, response, request.body);
  });

  const port = Number(process.env.MCP_HTTP_PORT ?? 5050);
  app.listen(port, async () => {
    await server.connect(transport);
    console.log(`MCP HTTP listening on http://localhost:${port}`);
  });
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
