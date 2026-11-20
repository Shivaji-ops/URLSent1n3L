/**
 * Real geography, not hand-drawn: Natural Earth 110m country polygons
 * (world-atlas, version-pinned) rasterised once into an equirectangular
 * land mask the engine samples particles against.
 */

export interface LandMask {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const SOURCE = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

let cache: LandMask | null = null;
let inflight: Promise<LandMask> | null = null;

interface Topology {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: {
    countries: {
      geometries: Array<
        | { type: 'Polygon'; arcs: number[][] }
        | { type: 'MultiPolygon'; arcs: number[][][] }
      >;
    };
  };
}

/** Fetches and rasterises the land mask. Cached for the page lifetime. */
export function loadLandMask(): Promise<LandMask> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error('land mask fetch failed: ' + res.status);
    const topo: Topology = await res.json();

    const [sx, sy] = topo.transform.scale;
    const [tx, ty] = topo.transform.translate;

    // TopoJSON delta decoding.
    const arcs: Array<Array<[number, number]>> = topo.arcs.map((arc) => {
      let x = 0;
      let y = 0;
      return arc.map((d) => {
        x += d[0];
        y += d[1];
        return [x * sx + tx, y * sy + ty] as [number, number];
      });
    });

    const stitch = (ids: number[]) => {
      const pts: Array<[number, number]> = [];
      ids.forEach((id) => {
        const a = id < 0 ? arcs[~id].slice().reverse() : arcs[id];
        for (let n = pts.length ? 1 : 0; n < a.length; n++) pts.push(a[n]);
      });
      return pts;
    };

    const polys: Array<Array<Array<[number, number]>>> = [];
    topo.objects.countries.geometries.forEach((g) => {
      if (g.type === 'Polygon') polys.push(g.arcs.map(stitch));
      else g.arcs.forEach((p) => polys.push(p.map(stitch)));
    });

    const W = 1024;
    const H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const g2 = cv.getContext('2d');
    if (!g2) throw new Error('2d context unavailable');
    g2.fillStyle = '#000';
    g2.fillRect(0, 0, W, H);
    g2.fillStyle = '#fff';

    polys.forEach((rings) => {
      // Countries crossing the antimeridian are drawn twice, shifted.
      let lo = Infinity;
      let hi = -Infinity;
      rings.forEach((r) =>
        r.forEach((p) => {
          if (p[0] < lo) lo = p[0];
          if (p[0] > hi) hi = p[0];
        })
      );
      const wraps = hi - lo > 180;
      for (let pass = 0; pass < (wraps ? 2 : 1); pass++) {
        const shift = pass ? -W : 0;
        g2.beginPath();
        rings.forEach((r) => {
          r.forEach((p, n) => {
            const lon = wraps && p[0] < 0 ? p[0] + 360 : p[0];
            const X = ((lon + 180) / 360) * W + shift;
            const Y = ((90 - p[1]) / 180) * H;
            if (n) g2.lineTo(X, Y);
            else g2.moveTo(X, Y);
          });
          g2.closePath();
        });
        g2.fill();
      }
    });

    cache = { width: W, height: H, data: g2.getImageData(0, 0, W, H).data };
    return cache;
  })();

  return inflight;
}

/** True when the given coordinate falls on land. */
export function isLand(mask: LandMask, lat: number, lon: number): boolean {
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(((lon + 180) / 360) * mask.width)));
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor(((90 - lat) / 180) * mask.height)));
  return mask.data[(y * mask.width + x) * 4] > 120;
}

/** Latitude/longitude in degrees to a unit-sphere vector. */
export function latLonToVec3(lat: number, lon: number): [number, number, number] {
  const p = (lat * Math.PI) / 180;
  const l = (lon * Math.PI) / 180;
  const r = Math.cos(p);
  return [Math.cos(l) * r, Math.sin(p), Math.sin(l) * r];
}
