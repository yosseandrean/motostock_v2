import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUnitForm, readUnitForm } from "@/lib/unit-create";
import { externalOrigin } from "@/lib/request-url";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", externalOrigin(request)), 303);
  }

  const values = readUnitForm(await request.formData());
  const parsed = parseUnitForm(values);

  if (!parsed.ok) {
    const url = new URL("/units/new", externalOrigin(request));
    url.searchParams.set("errors", JSON.stringify(parsed.errors));
    url.searchParams.set("values", JSON.stringify(values));
    return NextResponse.redirect(url, 303);
  }

  const warnings: string[] = [];
  if (parsed.data.chassisSerialNumber !== null) {
    const existing = await prisma.unit.findFirst({
      where: { chassisSerialNumber: parsed.data.chassisSerialNumber },
      select: { id: true },
    });
    if (existing) {
      warnings.push("chassis");
    }
  }
  const existingPlate = await prisma.unit.findFirst({
    where: { licensePlate: parsed.data.licensePlate },
    select: { id: true },
  });
  if (existingPlate) {
    warnings.push("license");
  }

  const unit = await prisma.unit.create({ data: parsed.data });

  const url = new URL(`/units/${unit.id}/edit`, externalOrigin(request));
  if (warnings.length > 0) {
    url.searchParams.set("warning", warnings.join(","));
  }
  return NextResponse.redirect(url, 303);
}
