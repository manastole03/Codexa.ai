import { NextResponse } from "next/server";
import { submissionCreateSchema } from "@codexa/types";
import { apiBaseUrl } from "@/lib/api";

export async function POST(request: Request) {
  const body = submissionCreateSchema.parse(await request.json());
  const response = await fetch(`${apiBaseUrl}/submissions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
