import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { Attendee } from "@/lib/attendee-types";

export async function getAttendees(): Promise<Attendee[]> {
  const db = getSupabase();
  const rows: Attendee[] = [];
  const pageSize = 1000;
  // Paginate so totals/export are not silently capped at Supabase's row limit.
  // Sufficient for a small ops tool; this is not a transactional snapshot.
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await db.from("attendees").select("*")
      .order("id", { ascending: true }).range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...data as Attendee[]);
    if (data.length < pageSize) break;
  }
  return rows;
}
