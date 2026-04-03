import { NextResponse } from "next/server";
import { getOnboardingProgress } from "@/server/actions/onboarding";

export async function GET() {
  const result = await getOnboardingProgress();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
