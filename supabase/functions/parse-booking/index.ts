// POST { filename, mime, data(base64), trip }  →  { booking: ParsedBooking }
// Reads a flight e-ticket / hotel confirmation / rail or bus booking (PDF or image) with Claude
// and returns structured fields incl. coordinates so the client can auto-pin stops.
import { askClaude, corsHeaders, extractJson, json, requireUser } from '../_shared/anthropic.ts';

const SYSTEM = `You extract travel bookings from documents. Return ONLY one JSON object:
{
  "type": "flight"|"hotel"|"train"|"car"|"ticket"|"other",
  "title": string,                 // e.g. "TG642 BKK→NRT" or "GranJam Tsugaike"
  "provider": string|null,         // airline / hotel chain / operator
  "reference": string|null,        // PNR / booking number
  "start_at": "YYYY-MM-DDTHH:MM"|null,  // flight departure, hotel check-in, train departure (LOCAL time, no TZ suffix)
  "end_at":   "YYYY-MM-DDTHH:MM"|null,  // flight arrival, hotel check-out, train arrival
  "from_name": string|null,        // departure airport/station name (null for hotels)
  "to_name": string|null,          // arrival airport/station, or hotel full address
  "from_lat": number|null, "from_lng": number|null,
  "to_lat": number|null,   "to_lng": number|null,  // for hotels: hotel coordinates
  "cost": number|null, "currency": string|null,
  "summary": string                // one plain-English line a traveller would read
}
Use your knowledge of airport / station / hotel coordinates (IATA codes → airport lat/lng; hotel name + city → lat/lng, accurate to ~200 m).
If the document holds a round trip, return the FIRST segment only but mention the return in summary.
If the check-out date is missing for a hotel, infer it from nights. Never invent a reference number.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await requireUser(req);
    const { filename, mime, data, trip } = await req.json();
    if (!data) return json({ error: 'data (base64) required' }, 400);

    const isPdf = mime === 'application/pdf' || /\.pdf$/i.test(filename ?? '');
    const block = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: (mime || 'image/jpeg') as string, data } };

    const text = await askClaude(SYSTEM, [block, { type: 'text', text: `Trip context: ${JSON.stringify(trip)}. File name: ${filename}. Extract the booking.` }], 1500);
    const booking = extractJson<Record<string, unknown>>(text);
    return json({ booking });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
