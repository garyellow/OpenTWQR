/**
 * Canvas-based QR Code component powered by qr-code-styling.
 *
 * Replaces the SVG-based QRCodeSVG from qrcode.react to support
 * per-dot and finder-pattern shape customisation.
 *
 * The underlying library is dynamically imported so it never blocks
 * the initial render (lazy loaded on first mount).
 *
 * Resolution: the canvas is rendered at physicalSize = cssSize × devicePixelRatio
 * and then scaled back to cssSize via CSS, giving sharp output on Retina / HiDPI
 * displays without any change to external layout measurements.
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

/**
 * Best-practice error correction:
 * - No logo  → M (15 % recovery, smaller QR modules)
 * - With logo → Q (25 % recovery, logo obscures the centre)
 *
 * Error level is not user-configurable; it is derived automatically.
 */
function effectiveErrorLevel(hasLogo: boolean): QRErrorLevel {
  return hasLogo ? 'Q' : 'M';
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
  /** Canvas render size in CSS px (the physical canvas will be size × devicePixelRatio). */
  size: number;
  /** Dot module shape. @default 'square' */
  dotStyle?: QRDotStyle;
  /** Finder-pattern (eye) shape. @default 'square' */
  eyeStyle?: QREyeStyle;
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
  /** CSS size in pixels — used for imageSize fraction calculation. */
  cssSize: number,
  /** Physical canvas size = cssSize × devicePixelRatio. */
  physicalSize: number,
  dotStyle: QRDotStyle,
  eyeStyle: QREyeStyle,
  centerImage?: StyledQRCodeCenterImage,
): Options {
  const hasLogo = Boolean(centerImage);
  const correctionLevel = effectiveErrorLevel(hasLogo);
  const dotType = toDotType(dotStyle);

  const opts: Options = {
    type: 'canvas',
    width: physicalSize,
    height: physicalSize,
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
    // imageSize fraction: the longer dimension as a proportion of CSS size
    // (not physicalSize), so the logo occupies the same visual proportion
    // regardless of display density.
    const longerDim = Math.max(centerImage.width, centerImage.height);
    const fraction = Math.min(0.40, Math.max(0.15, longerDim / cssSize));
    opts.imageOptions = {
      hideBackgroundDots: true,
      imageSize: fraction,
      margin: 2,
      saveAsBlob: false,
    };
  }

  return opts;
}

/** Scale CSS → physical pixels, capped at 3× to keep file sizes sane. */
function getPhysicalSize(cssSize: number): number {
  return Math.round(cssSize * Math.min(window.devicePixelRatio || 1, 3));
}

/**
 * After qr-code-styling appends a canvas, override its CSS dimensions back
 * to `cssSize` so it occupies the correct layout space while rendering at
 * native resolution.
 */
function fixCanvasCSS(container: HTMLDivElement, cssSize: number) {
  const canvas = container.querySelector('canvas');
  if (!canvas) return;
  canvas.style.width = `${cssSize}px`;
  canvas.style.height = `${cssSize}px`;
}

export const StyledQRCode = forwardRef<StyledQRCodeHandle, StyledQRCodeProps>(
  (
    {
      value,
      size,
      dotStyle = 'square',
      eyeStyle = 'square',
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
    // Physical size is computed from the current devicePixelRatio at call time.
    const buildOpts = useCallback(
      () => buildOptions(value, size, getPhysicalSize(size), dotStyle, eyeStyle, centerImage),
      [value, size, dotStyle, eyeStyle, centerImage],
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
        // Override the canvas CSS to display at cssSize while rendering at physicalSize.
        fixCanvasCSS(containerRef.current, size);
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
      // Re-apply CSS override after update (qr-code-styling resets style on update).
      if (containerRef.current) fixCanvasCSS(containerRef.current, size);
    }, [buildOpts, size]);

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
