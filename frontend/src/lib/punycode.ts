/**
 * Minimal RFC 3492 punycode encoder for a single domain label.
 * Pure and deterministic — see src/__tests__/analysis.test.ts.
 */
export function encodeLabel(label: string): string {
  const cps = Array.from(label).map((c) => c.codePointAt(0) as number);
  if (!cps.some((c) => c > 127)) return label;

  const basic = cps.filter((c) => c < 128);
  let out = basic.map((c) => String.fromCharCode(c)).join('');
  let handled = basic.length;
  const basicCount = handled;
  if (basicCount) out += '-';

  let n = 128;
  let delta = 0;
  let bias = 72;

  const adapt = (d: number, numPoints: number, first: boolean) => {
    d = first ? Math.floor(d / 700) : d >> 1;
    d += Math.floor(d / numPoints);
    let k = 0;
    while (d > 455) {
      d = Math.floor(d / 35);
      k += 36;
    }
    return k + Math.floor((36 * d) / (d + 38));
  };
  const digit = (v: number) => String.fromCharCode(v < 26 ? v + 97 : v + 22);

  while (handled < cps.length) {
    let m = Infinity;
    for (const c of cps) if (c >= n && c < m) m = c;
    delta += (m - n) * (handled + 1);
    n = m;
    for (const c of cps) {
      if (c < n) delta++;
      if (c === n) {
        let q = delta;
        for (let k = 36; ; k += 36) {
          const t = k <= bias ? 1 : k >= bias + 26 ? 26 : k - bias;
          if (q < t) break;
          out += digit(t + ((q - t) % (36 - t)));
          q = Math.floor((q - t) / (36 - t));
        }
        out += digit(q);
        bias = adapt(delta, handled + 1, handled === basicCount);
        delta = 0;
        handled++;
      }
    }
    delta++;
    n++;
  }
  return 'xn--' + out;
}

/** Encodes every label of a hostname. */
export function encodeHost(host: string): string {
  return host.split('.').map(encodeLabel).join('.');
}
