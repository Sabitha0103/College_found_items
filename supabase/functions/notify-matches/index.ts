// Supabase Edge Function: notify-matches
// Triggers email notifications to users who reported lost items
// when a matching found item (same category) is created.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Campus Finder <no-reply@yourapp.example>";

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase environment config" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY secret" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = await req.json().catch(() => ({}));
    const { foundItemId } = body as { foundItemId?: string };

    if (!foundItemId) {
      return new Response(JSON.stringify({ error: "foundItemId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the found item to get details (validates existence and reduces abuse risk)
    const { data: foundItem, error: foundErr } = await supabase
      .from("items")
      .select("id, title, description, category, location, user_id, created_at")
      .eq("id", foundItemId)
      .single();
    if (foundErr) throw foundErr;

    const category = foundItem.category;

    // Find matching lost items (same category, active), excluding the finder themself if available
    let lostQuery = supabase
      .from("items")
      .select("id, title, user_id, contact_info")
      .eq("type", "lost")
      .eq("status", "active")
      .eq("category", category);

    if (foundItem?.user_id) {
      lostQuery = lostQuery.neq("user_id", foundItem.user_id);
    }

    const { data: lostItems, error: lostError } = await lostQuery;
    if (lostError) throw lostError;

    // Build recipient list: prefer item's contact_info if it's an email; otherwise fall back to auth email via Admin API
    const toEmailsSet = new Set<string>();

    for (const li of lostItems ?? []) {
      const contact = (li as any).contact_info as string | null;
      if (contact && contact.includes("@")) {
        toEmailsSet.add(contact.trim());
      } else if (li.user_id) {
        try {
          const { data: userRes, error: userErr } = await (supabase as any).auth.admin.getUserById(li.user_id);
          if (!userErr) {
            const email = userRes?.user?.email;
            if (email) toEmailsSet.add(email);
          } else {
            console.warn("Failed to fetch user by id", li.user_id, userErr);
          }
        } catch (e) {
          console.warn("Admin getUserById failed", e);
        }
      }
    }

    // Send emails via Resend
    const toEmails = Array.from(toEmailsSet.values());

    let sent = 0;
    const failures: Array<{ to: string; error: string }> = [];

    const subject = `Possible match: Found item in ${category}`;
    const previewTitle = foundItem?.title ? `: “${foundItem.title}”` : "";
    const htmlBody = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
        <h2>We found a potential match in ${category}${previewTitle}</h2>
        <p>Someone just reported a found item in the <strong>${category}</strong> category.</p>
        ${foundItem ? `<p><strong>Title:</strong> ${foundItem.title}</p>` : ""}
        ${foundItem?.description ? `<p><strong>Description:</strong> ${foundItem.description}</p>` : ""}
        ${foundItem?.location ? `<p><strong>Location:</strong> ${foundItem.location}</p>` : ""}
        <p>Visit Campus Finder to view details and contact the finder.</p>
      </div>
    `;

    for (const to of toEmails) {
      try {
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: RESEND_FROM,
            to,
            subject,
            html: htmlBody,
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          failures.push({ to, error: errText });
        } else {
          sent += 1;
        }
      } catch (e: any) {
        failures.push({ to, error: String(e?.message ?? e) });
      }
    }

    const summary = {
      category,
      recipients: toEmails.length,
      sent,
      failures,
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("notify-matches error", err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
