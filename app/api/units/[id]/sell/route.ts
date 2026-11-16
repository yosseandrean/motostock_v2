import { readSellForm } from "@/lib/unit-sell";
import { sellUnit } from "@/lib/unit-write";
import {
  unitWriteRedirect,
  withAuthenticatedUnitRequest,
} from "@/lib/route-plumbing";

type Params = {
  id: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<Params> }
) {
  return withAuthenticatedUnitRequest(request, context, async (id, origin) => {
    const values = readSellForm(await request.formData());
    const result = await sellUnit(id, values);
    return unitWriteRedirect(origin, result, {
      path: `/units/${id}/sell`,
      values,
    });
  });
}
