import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseSellForm, readSellForm } from "@/lib/unit-sell";
import { externalOrigin } from "@/lib/request-url";

type Params = {
  id: string;
};

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

  const values = readSellForm(await request.formData());
  const parsed = parseSellForm(values);

  if (!parsed.ok) {
    const url = new URL(`/units/${numericId}/sell`, externalOrigin(request));
    url.searchParams.set("errors", JSON.stringify(parsed.errors));
    url.searchParams.set("values", JSON.stringify(values));
    return NextResponse.redirect(url, 303);
  }

  await prisma.unit.update({
    where: { id: numericId },
    data: {
      sellPrice: parsed.data.sellPrice,
      dateSold: parsed.data.dateSold,
      salesPerson: parsed.data.salesPerson,
    },
  });

  return NextResponse.redirect(new URL("/", externalOrigin(request)), 303);
}
