import { NextResponse } from "next/server";
import { dismissWizard } from "@/server/actions/onboarding";

export async function POST() {
  const result = await dismissWizard();

  if (result.success) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result, { status: 500 });
}
