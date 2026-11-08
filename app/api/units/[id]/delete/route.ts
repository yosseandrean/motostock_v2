import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  id: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const existing = await prisma.unit.findUnique({
    where: { id: numericId },
    select: { id: true },
  });
  if (existing === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  await prisma.unit.delete({ where: { id: numericId } });
  return NextResponse.redirect(new URL("/", request.url), 303);
}
