import { type NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/src/server/errors";
import { reorderHabits } from "@/src/server/habit-service";
import { createNotionHabitRepository } from "@/src/server/notion/repository";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    await reorderHabits(createNotionHabitRepository(), body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
