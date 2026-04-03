import { NextResponse } from "next/server";
import { completeWizard } from "@/server/actions/onboarding";

export async function POST() {
  const result = await completeWizard();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
