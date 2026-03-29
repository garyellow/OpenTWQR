import { useRef, type AnimationEvent } from 'react';
import { Clipboard, Link2, Image, Download, Copy } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useLocaleStore } from '../../stores/useLocaleStore';

interface ShareMenuProps {
  isClosing: boolean;
  onClose: () => void;
  onAnimationEnd: (e: AnimationEvent) => void;
  onCopyLink: () => void;
  onShareLink: () => void;
  onCopyImage?: () => Promise<void>;
  onShareImage: () => Promise<void>;
  onDownloadImage: () => Promise<void>;
  supportsNativeShare: boolean;
}

/** Share-action picker overlay rendered on top of the QR modal. */
export const ShareMenu = ({
  isClosing,
  onClose,
  onAnimationEnd,
  onCopyLink,
  onShareLink,
  onCopyImage,
  onShareImage,
  onDownloadImage,
  supportsNativeShare,
}: ShareMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, !isClosing);
  const t = useLocaleStore((s) => s.t);

  const itemClass =
    'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 action-transition text-left active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950';

  return (
    <div className="fixed inset-0 z-85">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm motion-reduce:animate-none ${
          isClosing ? 'animate-out fade-out duration-150' : 'animate-in fade-in duration-150'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card centering */}
      <div className="absolute inset-0 flex items-center justify-center p-5 pointer-events-none">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={t.share.menuLabel}
        className={`pointer-events-auto app-modal-shell relative w-full max-w-sm bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden overscroll-contain motion-reduce:animate-none ${
          isClosing ? 'animate-out fade-out zoom-out-95 duration-150' : 'animate-in fade-in zoom-in-95 duration-200'
        }`}
        onAnimationEnd={onAnimationEnd}
      >
        <div className="p-2 pt-3">
          <button type="button" onClick={onCopyLink} className={itemClass}>
            <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
              <Clipboard size={20} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.share.copyLink}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.share.copyLinkDesc}</p>
            </div>
          </button>

          {supportsNativeShare && (
            <button type="button" onClick={onShareLink} className={itemClass}>
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Link2 size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.share.shareLink}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.share.shareLinkDesc}</p>
              </div>
            </button>
          )}

          <div className="my-1 mx-2 border-t border-zinc-100 dark:border-zinc-800" />

          {onCopyImage && (
            <button type="button" onClick={onCopyImage} className={itemClass}>
              <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
                <Copy size={20} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
              </div>
              <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.share.copyImage}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.share.copyImageDesc}</p>
              </div>
            </button>
          )}

          <button type="button" onClick={onShareImage} className={itemClass}>
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Image size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.share.shareImage}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.share.shareImageDesc}</p>
            </div>
          </button>

          <button type="button" onClick={onDownloadImage} className={itemClass}>
            <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
              <Download size={20} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.share.downloadImage}</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">{t.share.downloadImageDesc}</p>
            </div>
          </button>
        </div>

        <div className="p-2 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm action-transition active:scale-98 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
