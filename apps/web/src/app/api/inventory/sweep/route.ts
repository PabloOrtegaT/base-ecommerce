import { NextResponse } from "next/server";
import { getRuntimeEnvironment } from "@/server/config/runtime-env";
import { sweepExpiredInventoryHolds } from "@/server/inventory/service";

export async function POST(request: Request) {
  const env = getRuntimeEnvironment();
  const expectedToken = env.INVENTORY_SWEEPER_TOKEN;

  if (!expectedToken) {
    return new NextResponse("Sweeper not configured", { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const providedToken = authHeader?.replace("Bearer ", "").trim();

  if (!providedToken || providedToken !== expectedToken) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const result = await sweepExpiredInventoryHolds();
    return NextResponse.json({
      success: true,
      sweptCount: result.sweptCount,
      restoredCount: result.restoredCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
