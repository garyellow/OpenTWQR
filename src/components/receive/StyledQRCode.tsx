/**
 * Canvas-based QR Code component powered by qr-code-styling.
 *
 * Replaces the SVG-based QRCodeSVG from qrcode.react to support
 * per-dot and finder-pattern shape customisation.
 *
 * The underlying library is dynamically imported so it never blocks
 * the initial render (lazy loaded on first mount).
 */
import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import type { QRDotStyle, QREyeStyle, QRErrorLevel } from '../../types';
import type { Options, DotType, CornerSquareType, CornerDotType } from 'qr-code-styling';

// ─── Type mappings ────────────────────────────────────────────

function toDotType(s: QRDotStyle): DotType {
  switch (s) {
    case 'rounded': return 'extra-rounded';
    case 'dots':    return 'dots';
    default:        return 'square';
  }
}

function toCornerSquareType(s: QREyeStyle): CornerSquareType {
  return s === 'rounded' ? 'extra-rounded' : 'square';
}

function toCornerDotType(s: QREyeStyle): CornerDotType {
  return s === 'rounded' ? 'dot' : 'square';
}

/** When a center logo is present, ensure error level is at least Q. */
function effectiveErrorLevel(level: QRErrorLevel, hasLogo: boolean): QRErrorLevel {
  if (!hasLogo) return level;
  const ORDER: QRErrorLevel[] = ['L', 'M', 'Q', 'H'];
  return ORDER.indexOf(level) >= ORDER.indexOf('Q') ? level : 'Q';
}

// ─── Props ────────────────────────────────────────────────────

export interface StyledQRCodeCenterImage {
  /** Data URI or URL of the centre image. Prefer data URIs for export reliability. */
  src: string;
  /** Width of the image in logical pixels (used to compute imageSize fraction). */
  width: number;
  /** Height of the image in logical pixels. */
  height: number;
}

export interface StyledQRCodeProps {
  /** QR code content string. */
  value: string;
  /** Canvas render size in CSS px (the canvas element will be exactly this size). */
  size: number;
  /** Dot module shape. @default 'square' */
  dotStyle?: QRDotStyle;
  /** Finder-pattern (eye) shape. @default 'square' */
  eyeStyle?: QREyeStyle;
  /** Error correction level. Auto-upgraded to Q when logo is shown. @default 'Q' */
  errorLevel?: QRErrorLevel;
  /** Optional centre image. */
  centerImage?: StyledQRCodeCenterImage;
  className?: string;
}

/** Imperative handle exposed via ref. */
export interface StyledQRCodeHandle {
  /** Returns the underlying canvas element for export, or null if not yet rendered. */
  getCanvas: () => HTMLCanvasElement | null;
}

// ─── Component ────────────────────────────────────────────────

function buildOptions(
  value: string,
  size: number,
  dotStyle: QRDotStyle,
  eyeStyle: QREyeStyle,
  errorLevel: QRErrorLevel,
  centerImage?: StyledQRCodeCenterImage,
): Options {
  const hasLogo = Boolean(centerImage);
  const correctionLevel = effectiveErrorLevel(errorLevel, hasLogo);
  const dotType = toDotType(dotStyle);

  const opts: Options = {
    type: 'canvas',
    width: size,
    height: size,
    margin: 0,
    data: value,
    qrOptions: {
      errorCorrectionLevel: correctionLevel,
    },
    dotsOptions: {
      type: dotType,
      color: '#000000',
    },
    cornersSquareOptions: {
      type: toCornerSquareType(eyeStyle),
      color: '#000000',
    },
    cornersDotOptions: {
      type: toCornerDotType(eyeStyle),
      color: '#000000',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
  };

  if (centerImage) {
    opts.image = centerImage.src;
    // imageSize fraction: the longer dimension as a proportion of QR size,
    // clamped to 0.15–0.40 to keep the logo readable but not too big.
    const longerDim = Math.max(centerImage.width, centerImage.height);
    const fraction = Math.min(0.40, Math.max(0.15, longerDim / size));
    opts.imageOptions = {
      hideBackgroundDots: true,
      imageSize: fraction,
      margin: 2,
      saveAsBlob: false,
    };
  }

  return opts;
}

export const StyledQRCode = forwardRef<StyledQRCodeHandle, StyledQRCodeProps>(
  (
    {
      value,
      size,
      dotStyle = 'square',
      eyeStyle = 'square',
      errorLevel = 'Q',
      centerImage,
      className,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    // Store the qr-code-styling instance so we can call .update() on it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qrInstanceRef = useRef<any>(null);
    const mountedRef = useRef(false);

    /** Expose the underlying canvas element for PNG export. */
    useImperativeHandle(
      ref,
      () => ({
        getCanvas: () =>
          containerRef.current?.querySelector('canvas') ?? null,
      }),
      [],
    );

    // Build the options object without triggering renders.
    const buildOpts = useCallback(
      () => buildOptions(value, size, dotStyle, eyeStyle, errorLevel, centerImage),
      [value, size, dotStyle, eyeStyle, errorLevel, centerImage],
    );

    // Initial mount: dynamically import and create the QR instance.
    useEffect(() => {
      let cancelled = false;

      (async () => {
        const mod = await import('qr-code-styling');
        const QRCodeStyling = mod.default;
        if (cancelled || !containerRef.current) return;

        const qr = new QRCodeStyling(buildOpts());
        qrInstanceRef.current = qr;

        // Clear any previous content, then append the new canvas.
        containerRef.current.innerHTML = '';
        qr.append(containerRef.current);
        mountedRef.current = true;
      })();

      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
    }, []);

    // Subsequent updates: call .update() instead of recreating.
    useEffect(() => {
      if (!mountedRef.current || !qrInstanceRef.current) return;
      qrInstanceRef.current.update(buildOpts());
    }, [buildOpts]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width: size, height: size, lineHeight: 0 }}
      />
    );
  },
);

StyledQRCode.displayName = 'StyledQRCode';
