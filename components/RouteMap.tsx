'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { loadMaps, MAPS_KEY, routePath, cumulative, pointAt, travellerSvg, kindPin } from '@/lib/maps';
import type { Stop, TravelMode, Day } from '@/lib/types';

interface Props {
  day: Day | null;
  stops: Stop[]; // stops for this day, in order, with lat/lng
  allStops?: Stop[]; // optional: every pinned stop (shown faintly)
  onPickLocation?: (loc: { lat: number; lng: number; name: string; address?: string; place_id?: string }) => void;
}

/**
 * Google Maps route with an animated traveller marker.
 * - Draws Directions for the day's stops in the day's travel mode.
 * - Play / pause / speed / scrub controls animate a walking or driving figure along the polyline.
 * - Clicking the map (or a Places search result) can hand a location back to the parent for pinning.
 */
export default function RouteMap({ day, stops, allStops = [], onPickLocation }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const searchEl = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polyRef = useRef<google.maps.Polyline | null>(null);
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const travellerRef = useRef<google.maps.Marker | null>(null);
  const pathRef = useRef<google.maps.LatLng[]>([]);
  const cumRef = useRef<number[]>([]);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const fracRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  const [playing, setPlaying] = useState(false);
  const [frac, setFrac] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [routeInfo, setRouteInfo] = useState<{ km: number; mins: number } | null>(null);
  const [routeErr, setRouteErr] = useState('');

  const mode: TravelMode = day?.travel_mode ?? 'DRIVING';
  const DURATION_MS = 20000; // full route at 1x

  /* ---------- init map ---------- */
  useEffect(() => {
    if (!MAPS_KEY || !mapEl.current) return;
    let cancelled = false;
    loadMaps()
      .then((g) => {
        if (cancelled || !mapEl.current) return;
        const center = stops.find((s) => s.lat != null) ?? allStops.find((s) => s.lat != null);
        const map = new g.maps.Map(mapEl.current, {
          center: center ? { lat: center.lat!, lng: center.lng! } : { lat: 35.68, lng: 139.76 },
          zoom: center ? 11 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
        });
        mapRef.current = map;

        if (onPickLocation) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (!e.latLng) return;
            const geocoder = new g.maps.Geocoder();
            geocoder.geocode({ location: e.latLng }, (res, status) => {
              const best = status === 'OK' && res && res[0];
              onPickLocation({
                lat: e.latLng!.lat(),
                lng: e.latLng!.lng(),
                name: best ? best.formatted_address.split(',')[0] : 'Pinned spot',
                address: best ? best.formatted_address : undefined,
                place_id: best ? best.place_id : undefined,
              });
            });
          });
          if (searchEl.current) {
            const ac = new g.maps.places.Autocomplete(searchEl.current, { fields: ['geometry', 'name', 'formatted_address', 'place_id'] });
            ac.bindTo('bounds', map);
            ac.addListener('place_changed', () => {
              const p = ac.getPlace();
              if (!p.geometry?.location) return;
              map.panTo(p.geometry.location);
              map.setZoom(14);
              onPickLocation({
                lat: p.geometry.location.lat(),
                lng: p.geometry.location.lng(),
                name: p.name ?? 'Place',
                address: p.formatted_address,
                place_id: p.place_id,
              });
              if (searchEl.current) searchEl.current.value = '';
            });
          }
        }
        setReady(true);
      })
      .catch((e) => setErr(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- draw markers + route whenever stops change ---------- */
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = google;
    const map = mapRef.current;
    stop();
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    polyRef.current?.setMap(null);
    rendererRef.current?.setMap(null);
    travellerRef.current?.setMap(null);
    setRouteInfo(null);
    setRouteErr('');
    pathRef.current = [];

    const pts = stops.filter((s) => s.lat != null && s.lng != null);
    const ids = new Set(pts.map((s) => s.id));

    // faint markers for other days
    allStops
      .filter((s) => s.lat != null && !ids.has(s.id))
      .forEach((s) => {
        markersRef.current.push(
          new g.maps.Marker({ map, position: { lat: s.lat!, lng: s.lng! }, title: s.name, opacity: 0.35, icon: { url: kindPin('·', '#9aa3b2'), scaledSize: new g.maps.Size(22, 28) } }),
        );
      });

    const bounds = new g.maps.LatLngBounds();
    pts.forEach((s, i) => {
      const pos = { lat: s.lat!, lng: s.lng! };
      bounds.extend(pos);
      const m = new g.maps.Marker({ map, position: pos, title: s.name, icon: { url: kindPin(String(i + 1)), scaledSize: new g.maps.Size(34, 44) }, zIndex: 10 + i });
      const iw = new g.maps.InfoWindow({ content: `<strong>${i + 1}. ${escapeHtml(s.name)}</strong><br/><span style="color:#666">${s.start_time ?? ''} ${escapeHtml(s.note ?? '')}</span>` });
      m.addListener('click', () => iw.open({ map, anchor: m }));
      markersRef.current.push(m);
    });
    if (pts.length) map.fitBounds(bounds, 60);
    if (pts.length < 2) return;

    const svc = new g.maps.DirectionsService();
    const origin = { lat: pts[0].lat!, lng: pts[0].lng! };
    const destination = { lat: pts[pts.length - 1].lat!, lng: pts[pts.length - 1].lng! };
    const waypoints = pts.slice(1, -1).map((s) => ({ location: { lat: s.lat!, lng: s.lng! }, stopover: true }));

    svc
      .route({ origin, destination, waypoints, travelMode: g.maps.TravelMode[mode] })
      .then((res) => {
        const renderer = new g.maps.DirectionsRenderer({ map, directions: res, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: mode === 'WALKING' ? '#5ee1c3' : '#ff8c6b', strokeWeight: 5, strokeOpacity: 0.85 } });
        rendererRef.current = renderer;
        const path = routePath(res);
        pathRef.current = path;
        cumRef.current = cumulative(path);
        const legs = res.routes[0].legs;
        const km = legs.reduce((a, l) => a + (l.distance?.value ?? 0), 0) / 1000;
        const mins = legs.reduce((a, l) => a + (l.duration?.value ?? 0), 0) / 60;
        setRouteInfo({ km, mins });
        travellerRef.current = new g.maps.Marker({ map, position: path[0], icon: { url: travellerSvg(mode, 0), scaledSize: new g.maps.Size(48, 48), anchor: new g.maps.Point(24, 24) }, zIndex: 999 });
        fracRef.current = 0;
        setFrac(0);
      })
      .catch((e: Error) => {
        // Fallback: straight polyline (e.g. TRANSIT not available between points)
        setRouteErr(`Directions unavailable (${e.message}). Showing straight lines.`);
        const path = pts.map((s) => new g.maps.LatLng(s.lat!, s.lng!));
        polyRef.current = new g.maps.Polyline({ map, path, strokeColor: '#9aa3b2', strokeWeight: 3, strokeOpacity: 0.8, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '14px' }] });
        pathRef.current = path;
        cumRef.current = cumulative(path);
        travellerRef.current = new g.maps.Marker({ map, position: path[0], icon: { url: travellerSvg(mode, 0), scaledSize: new g.maps.Size(48, 48), anchor: new g.maps.Point(24, 24) }, zIndex: 999 });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stops, mode]);

  /* ---------- animation ---------- */
  const render = useCallback(
    (f: number) => {
      const path = pathRef.current;
      if (!path.length || !travellerRef.current) return;
      const { pos, heading } = pointAt(path, cumRef.current, f);
      travellerRef.current.setPosition(pos);
      travellerRef.current.setIcon({ url: travellerSvg(mode, heading), scaledSize: new google.maps.Size(48, 48), anchor: new google.maps.Point(24, 24) });
      const map = mapRef.current;
      if (map && playing) {
        const b = map.getBounds();
        if (b && !b.contains(pos)) map.panTo(pos);
      }
    },
    [mode, playing],
  );

  const tick = useCallback(
    (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      fracRef.current = Math.min(1, fracRef.current + (dt * speed) / DURATION_MS);
      setFrac(fracRef.current);
      render(fracRef.current);
      if (fracRef.current >= 1) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [speed, render],
  );

  useEffect(() => {
    if (playing) {
      lastTsRef.current = 0;
      if (fracRef.current >= 1) fracRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, tick]);

  function stop() {
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
    fracRef.current = 0;
    setFrac(0);
  }

  function scrub(v: number) {
    fracRef.current = v;
    setFrac(v);
    render(v);
  }

  if (!MAPS_KEY) {
    return (
      <div className="map-wrap">
        <div className="map-empty">
          <div>
            <div style={{ fontSize: '2rem' }}>🗺️</div>
            <strong>Google Maps key missing</strong>
            <p className="small">
              Set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> (Maps JavaScript, Places, Directions, Geocoding enabled) to see the route and the
              animated traveller.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const elapsedMins = routeInfo ? Math.round(routeInfo.mins * frac) : 0;
  const hasRoute = pathRef.current.length > 1;

  return (
    <div className="stack">
      {onPickLocation && (
        <input ref={searchEl} className="input" placeholder="🔍 Search a place to pin (Google Places) — or click anywhere on the map" />
      )}
      <div className="map-wrap">
        <div ref={mapEl} className="map" />
        {err && <div className="alert error" style={{ position: 'absolute', top: 10, left: 10 }}>{err}</div>}
        {routeErr && <div className="alert" style={{ position: 'absolute', top: 10, left: 10, right: 10, fontSize: '.8rem' }}>{routeErr}</div>}
        {hasRoute && (
          <div className="player">
            <button className="btn sm" onClick={() => setPlaying((p) => !p)} title={playing ? 'Pause' : 'Play'}>
              {playing ? '⏸' : '▶'}
            </button>
            <button className="btn sm" onClick={stop} title="Restart">
              ⏮
            </button>
            <input type="range" min={0} max={1} step={0.001} value={frac} onChange={(e) => scrub(Number(e.target.value))} />
            <select className="input" style={{ width: 'auto', padding: '.3rem .4rem' }} value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {[0.5, 1, 2, 4].map((s) => (
                <option key={s} value={s}>
                  {s}×
                </option>
              ))}
            </select>
            <span className="time muted">
              {mode === 'WALKING' ? '🚶' : mode === 'DRIVING' ? '🚗' : mode === 'TRANSIT' ? '🚆' : '🚲'} {routeInfo ? `${elapsedMins}/${Math.round(routeInfo.mins)} min` : '—'}
            </span>
          </div>
        )}
      </div>
      {routeInfo && (
        <p className="muted small" style={{ margin: 0 }}>
          Route: {routeInfo.km.toFixed(1)} km · ~{Math.round(routeInfo.mins)} min by {mode.toLowerCase()} · {stops.filter((s) => s.lat != null).length} stops
        </p>
      )}
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}
