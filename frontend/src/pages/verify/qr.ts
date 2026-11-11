export type Kind = 'deed' | 'noc';

export const MAX_CODE = 30;

const CODE_RE = /^[A-Z0-9][A-Z0-9-]{0,29}$/;
const HASH_RE = /^[a-f0-9]{6,64}$/i;

/** Trim, uppercase and cap a typed or scanned code. */
export const cleanCode = (v: string | null | undefined) => String(v ?? '').trim().toUpperCase().slice(0, MAX_CODE);

export const safeCode = (v: string | null | undefined): string | null => {
  const c = cleanCode(v);
  return CODE_RE.test(c) ? c : null;
};

export const safeHash = (v: string | null | undefined): string | null => {
  const h = String(v ?? '').trim().slice(0, 64);
  return HASH_RE.test(h) ? h.toLowerCase() : null;
};

export const kindOf = (code: string, fallback: Kind = 'deed'): Kind =>
  code.startsWith('NOC-') ? 'noc' : code.startsWith('DL-') ? 'deed' : fallback;

export interface Target {
  kind: Kind;
  code: string;
  hash: string | null;
}

/**
 * Reads code/hash from a URL. Only deed_no / noc_no / code / h / kind are used;
 * the path form /verify/<id> and /verify/noc/<no> (printed on QR stickers) is accepted too.
 */
export const targetFromUrl = (url: URL): Target | null => {
  const p = url.searchParams;
  const hash = safeHash(p.get('h'));
  const noc = safeCode(p.get('noc_no'));
  if (noc) return { kind: 'noc', code: noc, hash };
  const deed = safeCode(p.get('deed_no'));
  if (deed) return { kind: 'deed', code: deed, hash };
  const code = safeCode(p.get('code'));
  if (code) return { kind: kindOf(code, p.get('kind') === 'noc' ? 'noc' : 'deed'), code, hash };

  const m = url.pathname.match(/\/verify\/(noc\/)?([^/]+)\/?$/i);
  if (m) {
    let seg = '';
    try {
      seg = decodeURIComponent(m[2]);
    } catch {
      return null;
    }
    const c = safeCode(seg);
    if (c) return { kind: m[1] ? 'noc' : kindOf(c), code: c, hash };
  }
  return null;
};

/** Parses the raw text of a scanned QR: either a plain code or a link. */
export const parseScanned = (raw: string): Target | null => {
  const text = String(raw ?? '').trim().slice(0, 600);
  if (!text) return null;
  const plain = safeCode(text);
  if (plain) return { kind: kindOf(plain), code: plain, hash: null };
  try {
    const url = new URL(text);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return targetFromUrl(url);
  } catch {
    return null;
  }
};

/* ---- BarcodeDetector (not in TS lib yet) ---- */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource | ImageBitmap | Blob): Promise<DetectedBarcode[]>;
}

export const hasBarcodeDetector = () => typeof window !== 'undefined' && 'BarcodeDetector' in window;

export const makeDetector = (): BarcodeDetectorLike | null => {
  if (!hasBarcodeDetector()) return null;
  try {
    const Ctor = (window as any).BarcodeDetector;
    return new Ctor({ formats: ['qr_code'] }) as BarcodeDetectorLike;
  } catch {
    return null;
  }
};

export const qrSupported = async (): Promise<boolean> => {
  if (!hasBarcodeDetector()) return false;
  try {
    const fmts: string[] = await (window as any).BarcodeDetector.getSupportedFormats?.();
    return Array.isArray(fmts) ? fmts.includes('qr_code') : true;
  } catch {
    return false;
  }
};
