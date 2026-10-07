// POST { query, trip, day, stops[], all_stops[] }  →  { suggestions: AiSuggestion[] }
import { askClaude, corsHeaders, extractJson, json, requireUser } from '../_shared/anthropic.ts';

interface Suggestion {
  name: string;
  kind: 'sight' | 'food' | 'hotel' | 'flight' | 'transport' | 'shop' | 'activity' | 'other';
  lat: number;
  lng: number;
  reason: string;
  reason_th?: string;
  est_cost?: number;
  best_time?: string;
}

const SYSTEM = `You are GoVibe, a travel planner. Recommend real, currently-operating places.
Return ONLY a JSON array (no prose) of 5-8 objects:
{ "name": string, "kind": "sight"|"food"|"hotel"|"shop"|"activity"|"transport"|"other",
  "lat": number, "lng": number, "reason": string (1 sentence, English),
  "reason_th": string (same, Thai), "est_cost": number per person in the trip currency (omit if free),
  "best_time": "HH:MM" (omit if any time) }
Rules: coordinates must be accurate to ~100 m. Prefer places within reasonable travel of the day's existing stops and
compatible with their times. Do not repeat places already in the plan. Respect budget hints and dietary hints in the query.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    await requireUser(req);
    const body = await req.json();
    const { query, trip, day, stops = [], all_stops = [] } = body;
    if (!query) return json({ error: 'query required' }, 400);

    const prompt = `Trip: ${JSON.stringify(trip)}
Day: ${JSON.stringify(day)}
Stops already planned today (in order): ${JSON.stringify(stops)}
Every place already in the whole trip (do not repeat): ${JSON.stringify(all_stops)}

Request: ${query}`;

    const text = await askClaude(SYSTEM, [{ type: 'text', text: prompt }], 2500);
    const suggestions = extractJson<Suggestion[]>(text).filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number' && s.name);
    return json({ suggestions });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
});
