import { type NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/src/server/errors";
import { createHabit } from "@/src/server/habit-service";
import { createNotionHabitRepository } from "@/src/server/notion/repository";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const habit = await createHabit(createNotionHabitRepository(), body);
    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
