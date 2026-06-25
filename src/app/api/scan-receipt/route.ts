import { NextResponse } from "next/server";
import { scanReceipt } from "@/ai/flows/scan-receipt";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.photoDataUri || typeof body.photoDataUri !== "string") {
      return NextResponse.json(
        { error: "photoDataUri is required (data URI string)" },
        { status: 400 }
      );
    }

    const result = await scanReceipt({ photoDataUri: body.photoDataUri });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Receipt scan failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
