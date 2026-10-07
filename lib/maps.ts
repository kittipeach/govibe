'use client';
import { Loader } from '@googlemaps/js-api-loader';

export const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

let loadPromise: Promise<typeof google> | null = null;

export function loadMaps(): Promise<typeof google> {
  if (!MAPS_KEY) return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set'));
  if (!loadPromise) {
    const loader = new Loader({ apiKey: MAPS_KEY, version: 'weekly', libraries: ['places', 'geometry', 'marker'] });
    loadPromise = loader.load();
  }
  return loadPromise;
}

/** Flatten a DirectionsResult into one dense LatLng path. */
export function routePath(result: google.maps.DirectionsResult): google.maps.LatLng[] {
  const path: google.maps.LatLng[] = [];
  for (const leg of result.routes[0]?.legs ?? []) {
    for (const step of leg.steps) {
      for (const p of step.path) path.push(p);
    }
  }
  return path;
}

/** Precompute cumulative distances so we can interpolate by fraction cheaply. */
export function cumulative(path: google.maps.LatLng[]): number[] {
  const cum = [0];
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + google.maps.geometry.spherical.computeDistanceBetween(path[i - 1], path[i]));
  }
  return cum;
}

/** Position + heading at a fraction (0..1) along the path. */
export function pointAt(path: google.maps.LatLng[], cum: number[], frac: number): { pos: google.maps.LatLng; heading: number } {
  const total = cum[cum.length - 1] || 1;
  const d = Math.max(0, Math.min(1, frac)) * total;
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const a = path[i - 1];
  const b = path[i] ?? a;
  const segLen = cum[i] - cum[i - 1] || 1;
  const t = (d - cum[i - 1]) / segLen;
  const pos = google.maps.geometry.spherical.interpolate(a, b, Math.max(0, Math.min(1, t)));
  const heading = google.maps.geometry.spherical.computeHeading(a, b);
  return { pos, heading };
}

/** SVG icon for the animated traveller. */
export function travellerSvg(mode: 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING', heading = 0): string {
  const flip = heading < 0 ? 'scale(-1,1) translate(-48,0)' : '';
  const body =
    mode === 'DRIVING'
      ? `<g transform="rotate(${heading - 90} 24 24)"><rect x="10" y="16" width="28" height="16" rx="5" fill="#ff8c6b" stroke="#1b1f27" stroke-width="2"/><rect x="15" y="12" width="18" height="9" rx="3" fill="#ffd166" stroke="#1b1f27" stroke-width="2"/><circle cx="16" cy="33" r="4" fill="#1b1f27"/><circle cx="32" cy="33" r="4" fill="#1b1f27"/><circle cx="37" cy="24" r="2" fill="#fff"/></g>`
      : mode === 'TRANSIT'
      ? `<g><rect x="12" y="10" width="24" height="26" rx="5" fill="#5ee1c3" stroke="#1b1f27" stroke-width="2"/><rect x="16" y="14" width="16" height="9" rx="2" fill="#fff"/><circle cx="18" cy="31" r="2.5" fill="#1b1f27"/><circle cx="30" cy="31" r="2.5" fill="#1b1f27"/><rect x="14" y="36" width="20" height="3" fill="#1b1f27"/></g>`
      : mode === 'BICYCLING'
      ? `<g transform="${flip}"><circle cx="13" cy="33" r="7" fill="none" stroke="#1b1f27" stroke-width="2.5"/><circle cx="35" cy="33" r="7" fill="none" stroke="#1b1f27" stroke-width="2.5"/><path d="M13 33 L22 20 L32 20 L35 33 M22 20 L27 33" stroke="#ff8c6b" stroke-width="3" fill="none"/><circle cx="26" cy="11" r="4" fill="#ffd166" stroke="#1b1f27" stroke-width="2"/></g>`
      : `<g transform="${flip}"><circle cx="24" cy="10" r="5" fill="#ffd166" stroke="#1b1f27" stroke-width="2"/><path d="M24 15 L24 28 M24 19 L17 25 M24 19 L31 23 M24 28 L18 40 M24 28 L31 39" stroke="#5ee1c3" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M24 15 L24 28 M24 19 L17 25 M24 19 L31 23 M24 28 L18 40 M24 28 L31 39" stroke="#1b1f27" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".5"/></g>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff" fill-opacity=".85" stroke="#1b1f27" stroke-width="1.5"/>${body}</svg>`,
  )}`;
}

export function kindPin(label: string, color = '#5ee1c3'): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 43 C17 43 2 25 2 16 A15 15 0 0 1 32 16 C32 25 17 43 17 43Z" fill="${color}" stroke="#1b1f27" stroke-width="2"/><circle cx="17" cy="16" r="10" fill="#fff"/><text x="17" y="21" text-anchor="middle" font-size="13" font-family="sans-serif" font-weight="700" fill="#1b1f27">${label}</text></svg>`,
  )}`;
}
