// Supabase Edge Function: notify-lost-on-found
// Sends emails to users who reported lost items in the same category
// when a new found item is created.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FoundItemPayload = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  description?: string | null;
  location?: string | null;
};

type LostItemRow = {
  id: string;
  title: string;
  contact_info: string | null;
  user_id: string;
};

function isEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
}

function composeEmail(found: FoundItemPayload) {
  const subject = `New found item in ${found.category} may match your lost item`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5;">
      <h2>Possible match for your lost item</h2>
      <p>Someone just reported a <strong>found</strong> item in the <strong>${found.category}</strong> category.</p>
      <ul>
        <li><strong>Title:</strong> ${found.title}</li>
        ${found.description ? `<li><strong>Description:</strong> ${found.description}</li>` : ""}
        ${found.location ? `<li><strong>Location:</strong> ${found.location}</li>` : ""}
      </ul>
      <p>Visit the app to review details and contact the finder.</p>
    </div>
  `;
  return { subject, html };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const found: FoundItemPayload | undefined = payload?.foundItem;
  if (!found || !found.category || !found.user_id) {
    return new Response(JSON.stringify({ error: "Missing required foundItem payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Server missing Supabase configuration" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: lostItems, error: lostError } = await supabaseAdmin
    .from("items")
    .select("id, title, contact_info, user_id")
    .eq("type", "lost")
    .eq("status", "active")
    .eq("category", found.category);

  if (lostError) {
    return new Response(JSON.stringify({ error: "Failed querying lost items", details: lostError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recipients = new Set<string>();
  const missingEmailUserIds = new Set<string>();

  for (const item of (lostItems || []) as LostItemRow[]) {
    if (item.user_id === found.user_id) continue; // do not email the same user who posted the found item
    if (isEmail(item.contact_info)) recipients.add(item.contact_info.trim());
    else missingEmailUserIds.add(item.user_id);
  }

  // Try to resolve emails via auth.users for those without an email in contact_info
  for (const uid of missingEmailUserIds) {
    try {
      const { data } = await supabaseAdmin.auth.admin.getUserById(uid);
      const email = data?.user?.email;
      if (email) recipients.add(email);
    } catch (_) {
      // ignore failures fetching user
    }
  }

  const toList = Array.from(recipients);
  if (toList.length === 0) {
    return new Response(
      JSON.stringify({ message: "No recipients to notify", recipients: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "notifications@no-reply.local";

  const { subject, html } = composeEmail(found);

  // If no email provider configured, exit gracefully but report recipients
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({
        message: "Email provider not configured. Set RESEND_API_KEY and FROM_EMAIL.",
        wouldNotify: toList,
        subject,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const results = await Promise.all(
    toList.map(async (to) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to,
          subject,
          html,
        }),
      });
      const ok = res.ok;
      const detail = ok ? undefined : await res.text().catch(() => undefined);
      return { to, ok, detail };
    })
  );

  const successes = results.filter((r) => r.ok).map((r) => r.to);
  const failures = results.filter((r) => !r.ok);

  return new Response(
    JSON.stringify({ successes, failures }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
