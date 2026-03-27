import { NextResponse } from "next/server";

export function jsonResponse(data: unknown, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorizedResponse() {
  return errorResponse("Unauthorized", 401);
}

export function forbiddenResponse() {
  return errorResponse("Forbidden", 403);
}

export function notFoundResponse(resource: string = "Resource") {
  return errorResponse(`${resource} not found`, 404);
}

export function formatCentsToCFA(cents: number): string {
  return `${Math.ceil(cents / 100).toLocaleString("fr-FR")} FCFA`;
}
