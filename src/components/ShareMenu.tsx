import { useRef, type AnimationEvent } from 'react';
import { Clipboard, Link2, Image, Download } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ShareMenuProps {
  isClosing: boolean;
  onClose: () => void;
  onAnimationEnd: (e: AnimationEvent) => void;
  onCopyLink: () => void;
  onShareLink: () => void;
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
  onShareImage,
  onDownloadImage,
  supportsNativeShare,
}: ShareMenuProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, !isClosing);

  const itemClass =
    'w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950';

  return (
    <div className="fixed inset-0 z-[85]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/20 dark:bg-black/40 motion-reduce:animate-none ${
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
        aria-label="分享方式"
        className={`pointer-events-auto relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden motion-reduce:animate-none ${
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
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">複製連結</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">複製收款頁面連結到剪貼簿</p>
            </div>
          </button>

          {supportsNativeShare && (
            <button type="button" onClick={onShareLink} className={itemClass}>
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Link2 size={20} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">分享連結</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">透過系統分享模組傳送連結</p>
              </div>
            </button>
          )}

          <div className="my-1 mx-2 border-t border-zinc-100 dark:border-zinc-800" />

          <button type="button" onClick={onShareImage} className={itemClass}>
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Image size={20} className="text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">分享圖片</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">將 QR Code 圖片傳送給對方</p>
            </div>
          </button>

          <button type="button" onClick={onDownloadImage} className={itemClass}>
            <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
              <Download size={20} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">下載圖片</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">儲存 QR Code 至裝置</p>
            </div>
          </button>
        </div>

        <div className="p-2 pb-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            取消
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
