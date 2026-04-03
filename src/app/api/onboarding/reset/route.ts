import { NextResponse } from "next/server";
import { resetOnboarding } from "@/server/actions/onboarding";

export async function POST() {
  const result = await resetOnboarding();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
