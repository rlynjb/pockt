import { type NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/src/server/errors";
import { setCompletion } from "@/src/server/habit-service";
import { createNotionHabitRepository } from "@/src/server/notion/repository";
import { parseRequiredBoolean, parseRequiredObject } from "@/src/server/request-validation";

type Params = { params: Promise<{ habitId: string; date: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { habitId, date } = await params;
    const body = parseRequiredObject(await request.json(), "request body");
    const completion = await setCompletion(createNotionHabitRepository(), {
      habitId,
      date,
      completed: parseRequiredBoolean(body.completed, "completed")
    });
    return NextResponse.json({ completion });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
