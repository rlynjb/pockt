import { type NextRequest, NextResponse } from "next/server";
import { toErrorResponse } from "@/src/server/errors";
import { archiveHabit, updateHabit } from "@/src/server/habit-service";
import { createNotionHabitRepository } from "@/src/server/notion/repository";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const habit = await updateHabit(createNotionHabitRepository(), id, body);
    return NextResponse.json(habit);
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const habit = await archiveHabit(createNotionHabitRepository(), id);
    return NextResponse.json(habit);
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
