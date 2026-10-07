// Shared helper for calling Claude from Supabase Edge Functions (Deno).
// Secret: ANTHROPIC_API_KEY  →  `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

export const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
  | { type: 'document'; source: { type: 'base64'; media_type: 'application/pdf'; data: string } };

export async function askClaude(system: string, content: ContentBlock[], maxTokens = 2000): Promise<string> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY secret is not set');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content ?? []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n');
}

/** Pull the first JSON object/array out of a model reply. */
export function extractJson<T>(text: string): T {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
  const raw = (m[1] ?? text).trim();
  const start = Math.min(...[raw.indexOf('{'), raw.indexOf('[')].filter((i) => i >= 0));
  return JSON.parse(raw.slice(start)) as T;
}

/** Require a signed-in Supabase user (the client sends its JWT automatically). */
export async function requireUser(req: Request): Promise<string> {
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing Authorization');
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('Not signed in');
  const u = await r.json();
  return u.id as string;
}
