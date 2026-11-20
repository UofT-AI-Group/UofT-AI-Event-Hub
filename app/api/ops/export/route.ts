import { isOpsAuthenticated } from "@/lib/ops-auth";
import { getAttendees } from "@/lib/attendees";
import { hasSupabaseConfig } from "@/lib/supabase";
import { attendeesCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!await isOpsAuthenticated()) return new Response("Unauthorized", { status: 401, headers });
  if (!hasSupabaseConfig()) return new Response("Supabase is not configured", { status: 503, headers });
  try {
    return new Response(attendeesCsv(await getAttendees()), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="conferencex-attendees.csv"',
      },
    });
  } catch {
    return new Response("Unable to export attendees", { status: 503, headers });
  }
}
