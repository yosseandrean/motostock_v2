import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUnitForm, readUnitForm } from "@/lib/unit-create";
import { externalOrigin } from "@/lib/request-url";

type Params = {
  id: string;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", externalOrigin(request)), 303);
  }

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const unit = await prisma.unit.findUnique({ where: { id: numericId } });
  if (unit === null) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.json(unit);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<Params> },
) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", externalOrigin(request)), 303);
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

  const values = readUnitForm(await request.formData());
  const parsed = parseUnitForm(values);

  if (!parsed.ok) {
    const url = new URL(`/units/${numericId}/edit`, externalOrigin(request));
    url.searchParams.set("errors", JSON.stringify(parsed.errors));
    url.searchParams.set("values", JSON.stringify(values));
    return NextResponse.redirect(url, 303);
  }

  const warnings: string[] = [];
  if (parsed.data.chassisSerialNumber !== null) {
    const existingChassis = await prisma.unit.findFirst({
      where: {
        chassisSerialNumber: parsed.data.chassisSerialNumber,
        NOT: { id: numericId },
      },
      select: { id: true },
    });
    if (existingChassis) {
      warnings.push("chassis");
    }
  }
  const existingPlate = await prisma.unit.findFirst({
    where: { licensePlate: parsed.data.licensePlate, NOT: { id: numericId } },
    select: { id: true },
  });
  if (existingPlate) {
    warnings.push("license");
  }

  await prisma.unit.update({ where: { id: numericId }, data: parsed.data });

  if (warnings.length > 0) {
    const url = new URL(`/units/${numericId}/edit`, externalOrigin(request));
    url.searchParams.set("warning", warnings.join(","));
    return NextResponse.redirect(url, 303);
  }

  return NextResponse.redirect(new URL("/", externalOrigin(request)), 303);
}
