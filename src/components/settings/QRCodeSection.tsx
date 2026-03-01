import { useState, useCallback, useRef, useEffect } from 'react';
import { QrCode, Tag, Landmark, X } from 'lucide-react';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { haptic } from '../../utils/haptics';
import { AnimatedModal } from '../ui/AnimatedModal';

/**
 * QR Code display settings — bank icon switch, custom name (modal), and bank name toggle.
 *
 * Rendered **inside** PersonalizationSection after App Lock, not as its own card.
 * Exported so it can be composed into the parent section.
 */
export const QRCodeSection = () => {
  const t = useLocaleStore((s) => s.t);

  const logoType = useQRSettingsStore((s) => s.logoType);
  const showBankName = useQRSettingsStore((s) => s.showBankName);
  const customName = useQRSettingsStore((s) => s.customName);
  const setLogoType = useQRSettingsStore((s) => s.setLogoType);
  const setShowBankName = useQRSettingsStore((s) => s.setShowBankName);
  const setCustomName = useQRSettingsStore((s) => s.setCustomName);

  const [showNameModal, setShowNameModal] = useState(false);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const bankIconEnabled = logoType === 'bank';

  useEffect(() => {
    if (showNameModal) setDraftName(customName);
  }, [showNameModal, customName]);

  const handleToggleLogo = useCallback(() => {
    haptic();
    setLogoType(bankIconEnabled ? 'opentwqr' : 'bank');
  }, [bankIconEnabled, setLogoType]);

  const handleToggleBankName = useCallback(() => {
    haptic();
    setShowBankName(!showBankName);
  }, [showBankName, setShowBankName]);

  const handleOpenNameModal = useCallback(() => {
    setShowNameModal(true);
  }, []);

  const handleConfirmName = useCallback((close: () => void) => {
    setCustomName(draftName.trim());
    close();
  }, [draftName, setCustomName]);

  const handleClearName = useCallback((close: () => void) => {
    setCustomName('');
    close();
  }, [setCustomName]);

  return (
    <>
      {/* ── Bank icon switch (ON = bank icon, OFF = OpenTWQR) ── */}
      <button
        type="button"
        role="switch"
        aria-checked={bankIconEnabled}
        onClick={handleToggleLogo}
        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
            <QrCode size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.logoTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.logoDesc}</p>
          </div>
        </div>
        {/* Toggle switch */}
        <div
          aria-hidden="true"
          className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 ${
            bankIconEnabled ? '' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
          style={bankIconEnabled ? { backgroundColor: 'light-dark(var(--accent), var(--accent-dark))' } : undefined}
        >
          <div
            className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
              bankIconEnabled ? 'translate-x-5.25' : 'translate-x-0.75'
            }`}
          />
        </div>
      </button>

      {/* ── Custom name — tap to open modal ── */}
      <button
        type="button"
        onClick={handleOpenNameModal}
        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Tag size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.customNameTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.customNameDesc}</p>
          </div>
        </div>
        {customName.trim() && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400 truncate max-w-28">{customName.trim()}</span>
        )}
      </button>

      {/* ── Show bank name toggle ── */}
      <button
        type="button"
        role="switch"
        aria-checked={showBankName}
        onClick={handleToggleBankName}
        className="w-full flex items-center justify-between p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Landmark size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.bankNameTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.bankNameDesc}</p>
          </div>
        </div>
        {/* Toggle switch */}
        <div
          aria-hidden="true"
          className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 ${
            showBankName ? '' : 'bg-zinc-300 dark:bg-zinc-600'
          }`}
          style={showBankName ? { backgroundColor: 'light-dark(var(--accent), var(--accent-dark))' } : undefined}
        >
          <div
            className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${
              showBankName ? 'translate-x-5.25' : 'translate-x-0.75'
            }`}
          />
        </div>
      </button>

      {/* ── Custom name modal ── */}
      {showNameModal && (
        <AnimatedModal
          onClose={() => setShowNameModal(false)}
          overlayClass="z-50"
          cardClass="max-w-sm p-6"
          ariaLabelledby="custom-name-modal-title"
          initialFocusRef={inputRef}
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 id="custom-name-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t.qrSettings.customNameModalTitle}
                </h2>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t.common.close}
                  className="p-2.5 -mr-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleConfirmName(requestClose);
                    }
                  }}
                  placeholder={t.qrSettings.customNamePlaceholder}
                  autoComplete="off"
                  maxLength={20}
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 pr-14 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 transition-all shadow-xs"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 dark:text-zinc-400 pointer-events-none">
                  {draftName.length}/20
                </span>
              </div>
              <div className="flex gap-3 mt-4">
                {(customName || draftName.trim()) && (
                  <button
                    type="button"
                    onClick={() => handleClearName(requestClose)}
                    className="flex-1 py-4 rounded-xl font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                  >
                    {t.qrSettings.customNameClear}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleConfirmName(requestClose)}
                  className="flex-2 py-4 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.confirm}
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}
    </>
  );
};
