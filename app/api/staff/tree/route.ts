import { requireApi, withApi, json } from "@/lib/api";
import { getOrgTree } from "@/lib/org";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireApi("staff.view");
  const tree = await getOrgTree(user);
  return json(tree);
});
