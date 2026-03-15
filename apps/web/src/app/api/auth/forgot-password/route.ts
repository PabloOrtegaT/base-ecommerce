import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/server/auth/service";
import { forgotPasswordInputSchema } from "@/server/auth/validation";

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const formData = await request.formData();
  const payload = forgotPasswordInputSchema.safeParse({
    email: formData.get("email"),
  });

  if (!payload.success) {
    return NextResponse.redirect(new URL("/forgot-password?error=invalid_input", request.url));
  }

  await requestPasswordReset(payload.data.email, requestOrigin);
  return NextResponse.redirect(new URL("/forgot-password?sent=1", request.url));
}
