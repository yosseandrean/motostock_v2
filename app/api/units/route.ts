import { readUnitForm } from "@/lib/unit-spec";
import { createUnit } from "@/lib/unit-write";
import {
  unitWriteRedirect,
  withAuthenticatedRequest,
} from "@/lib/route-plumbing";

export async function POST(request: Request) {
  return withAuthenticatedRequest(request, async (origin) => {
    const values = readUnitForm(await request.formData());
    const result = await createUnit(values);
    return unitWriteRedirect(origin, result, {
      path: "/units/new",
      values,
    });
  });
}
