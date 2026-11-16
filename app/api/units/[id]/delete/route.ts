import { deleteUnit } from "@/lib/unit-write";
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
    const result = await deleteUnit(id);
    return unitWriteRedirect(origin, result);
  });
}
