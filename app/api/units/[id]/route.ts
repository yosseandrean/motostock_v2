import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readUnitForm } from "@/lib/unit-spec";
import { updateUnit } from "@/lib/unit-write";
import {
  unitWriteRedirect,
  withAuthenticatedUnitRequest,
} from "@/lib/route-plumbing";

type Params = {
  id: string;
};

type Context = {
  params: Promise<Params>;
};

export async function GET(request: Request, context: Context) {
  return withAuthenticatedUnitRequest(request, context, async (id) => {
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (unit === null) {
      return new NextResponse("Not found", { status: 404 });
    }
    return NextResponse.json(unit);
  });
}

export async function POST(request: Request, context: Context) {
  return withAuthenticatedUnitRequest(request, context, async (id, origin) => {
    const values = readUnitForm(await request.formData());
    const result = await updateUnit(id, values);
    return unitWriteRedirect(origin, result, {
      path: `/units/${id}/edit`,
      values,
    });
  });
}
