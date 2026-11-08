import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUnitForm } from "@/lib/unit-create";
import type { UnitFormValues } from "@/lib/unit-create";

function readFormValues(formData: FormData): UnitFormValues {
  const read = (name: string): string => String(formData.get(name) ?? "");
  return {
    brand: read("brand"),
    model: read("model"),
    modelYear: read("modelYear"),
    licensePlate: read("licensePlate"),
    color: read("color"),
    buyPrice: read("buyPrice"),
    cost: read("cost"),
    sellPrice: read("sellPrice"),
    dateBought: read("dateBought"),
    dateSold: read("dateSold"),
    salesPerson: read("salesPerson"),
    nameOnRegistration: read("nameOnRegistration"),
    chassisSerialNumber: read("chassisSerialNumber"),
    engineSerialNumber: read("engineSerialNumber"),
    boughtFrom: read("boughtFrom"),
    notes: read("notes"),
  };
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const values = readFormValues(await request.formData());
  const parsed = parseUnitForm(values);

  if (!parsed.ok) {
    const url = new URL("/units/new", request.url);
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

  const url = new URL(`/units/${unit.id}`, request.url);
  if (warnings.length > 0) {
    url.searchParams.set("warning", warnings.join(","));
  }
  return NextResponse.redirect(url, 303);
}
