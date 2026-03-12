import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (_req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Query documents updated in the last 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: documents, error: queryError } = await supabase
      .from("documents")
      .select("id, yjs_state, created_by")
      .gt("updated_at", cutoff);

    if (queryError) {
      return new Response(JSON.stringify({ error: queryError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No documents to snapshot", count: 0 }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const rows = documents.map((doc) => {
      const contentBase64 = doc.yjs_state
        ? btoa(
            String.fromCharCode(
              ...new Uint8Array(
                // Handle both raw bytes and base64 from Supabase
                typeof doc.yjs_state === "string"
                  ? Uint8Array.from(atob(doc.yjs_state), (c) => c.charCodeAt(0))
                  : doc.yjs_state,
              ),
            ),
          )
        : null;

      return {
        document_id: doc.id,
        label: `Auto-snapshot \u00b7 ${formattedDate}`,
        content_json: { yjs_state_base64: contentBase64 },
        type: "automatic",
        created_by: doc.created_by,
      };
    });

    const { error: insertError } = await supabase
      .from("document_snapshots")
      .insert(rows);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, count: rows.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
