import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/supabase.server";
import { lookupDoi, lookupUrl } from "~/lib/reference-lookup.server";

export async function action({ request }: ActionFunctionArgs) {
  // Require authentication
  await requireAuth(request);

  const body = (await request.json()) as { query?: string; type?: string };
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const type = body.type === "url" ? "url" : "doi";

  if (!query) {
    return Response.json({ success: false, error: "No query provided." });
  }

  const result = type === "doi" ? await lookupDoi(query) : await lookupUrl(query);

  return Response.json(result);
}
