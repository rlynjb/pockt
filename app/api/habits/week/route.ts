import { type NextRequest, NextResponse } from "next/server";
import { assertDateOnly } from "@/src/domain/week";
import { toErrorResponse } from "@/src/server/errors";
import { getWeek } from "@/src/server/habit-service";
import { createNotionHabitRepository } from "@/src/server/notion/repository";

export async function GET(request: NextRequest) {
  try {
    const start = request.nextUrl.searchParams.get("start");
    if (!start) {
      return NextResponse.json({ error: "Missing week start date" }, { status: 400 });
    }
    const today = request.nextUrl.searchParams.get("today");
    if (!today) {
      return NextResponse.json({ error: "Missing local today date" }, { status: 400 });
    }
    const body = await getWeek(createNotionHabitRepository(), start, assertDateOnly(today));
    return NextResponse.json(body);
  } catch (error) {
    const response = toErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
