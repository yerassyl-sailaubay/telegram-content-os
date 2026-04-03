import { NextResponse } from "next/server";
import { markTourCompleted } from "@/server/actions/onboarding";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tourId } = body;

    if (!tourId || typeof tourId !== "string") {
      return NextResponse.json({ success: false, error: "Tour ID is required" }, { status: 400 });
    }

    const result = await markTourCompleted(tourId);

    if (result.success) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result, { status: 500 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }
}
