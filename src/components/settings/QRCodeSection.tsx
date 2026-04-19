import { useState, useCallback, useMemo, useRef } from 'react';
import { QrCode, UserPen, Landmark, X, CreditCard, ChevronRight, Shapes } from 'lucide-react';
import { useQRSettingsStore } from '../../stores/useQRSettingsStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { haptic } from '../../utils/haptics';
import { AnimatedModal } from '../ui/AnimatedModal';
import type { QRDotStyle, QREyeStyle } from '../../types';
import { shouldAutoFocusTextInput } from '../../utils/shouldAutoFocusTextInput';

/**
 * QR Code display settings — rendered as a single row in PersonalizationSection.
 * Clicking opens a settings modal with four toggles/rows.
 * The custom name row opens a nested name-edit modal.
 */
export const QRCodeSection = () => {
  const t = useLocaleStore((s) => s.t);

  const logoType = useQRSettingsStore((s) => s.logoType);
  const showAccount = useQRSettingsStore((s) => s.showAccount);
  const showBankName = useQRSettingsStore((s) => s.showBankName);
  const customName = useQRSettingsStore((s) => s.customName);
  const dotStyle = useQRSettingsStore((s) => s.dotStyle);
  const eyeStyle = useQRSettingsStore((s) => s.eyeStyle);
  const setLogoType = useQRSettingsStore((s) => s.setLogoType);
  const setShowAccount = useQRSettingsStore((s) => s.setShowAccount);
  const setShowBankName = useQRSettingsStore((s) => s.setShowBankName);
  const setCustomName = useQRSettingsStore((s) => s.setCustomName);
  const setDotStyle = useQRSettingsStore((s) => s.setDotStyle);
  const setEyeStyle = useQRSettingsStore((s) => s.setEyeStyle);

  const bankIconEnabled = logoType === 'bank';

  const [showSettings, setShowSettings] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showStyleModal, setShowStyleModal] = useState(false);
  const [draftName, setDraftName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const allowAutoFocus = useMemo(() => shouldAutoFocusTextInput(), []);

  /** Summary label of current dot + eye style, used as description in the settings row. */
  const dotStyleLabel = dotStyle === 'square' ? t.qrSettings.dotStyleSquare
    : dotStyle === 'rounded' ? t.qrSettings.dotStyleRounded
    : t.qrSettings.dotStyleDots;
  const eyeStyleLabel = eyeStyle === 'square' ? t.qrSettings.eyeStyleSquare : t.qrSettings.eyeStyleRounded;
  const styleSummary = t.qrSettings.styleSummary(dotStyleLabel, eyeStyleLabel);

  const handleToggleLogo = useCallback(() => { haptic(); setLogoType(bankIconEnabled ? 'opentwqr' : 'bank'); }, [bankIconEnabled, setLogoType]);
  const handleToggleAccount = useCallback(() => { haptic(); setShowAccount(!showAccount); }, [showAccount, setShowAccount]);
  const handleToggleBankName = useCallback(() => { haptic(); setShowBankName(!showBankName); }, [showBankName, setShowBankName]);

  const handleSetDotStyle = useCallback((s: QRDotStyle) => { haptic(); setDotStyle(s); }, [setDotStyle]);
  const handleSetEyeStyle = useCallback((s: QREyeStyle) => { haptic(); setEyeStyle(s); }, [setEyeStyle]);

  const handleOpenNameModal = useCallback(() => {
    setDraftName(customName);
    setShowNameModal(true);
  }, [customName]);

  const handleConfirmName = useCallback((close: () => void) => {
    setCustomName(draftName.trim());
    close();
  }, [draftName, setCustomName]);

  const handleClearName = useCallback((close: () => void) => {
    setCustomName('');
    close();
  }, [setCustomName]);

  /** Inline toggle switch — reusable helper. */
  const toggleSwitch = (checked: boolean) => (
    <div
      aria-hidden="true"
      className={`relative shrink-0 w-11 h-6.5 rounded-full transition-colors duration-200 ${checked ? '' : 'bg-zinc-300 dark:bg-zinc-600'}`}
      style={checked ? { backgroundColor: 'var(--ca)' } : undefined}
    >
      <div className={`absolute top-0.75 w-5 h-5 bg-white rounded-full shadow-xs transition-transform duration-200 ${checked ? 'translate-x-5.25' : 'translate-x-0.75'}`} />
    </div>
  );

  return (
    <>
      {/* ── Outer row — opens settings modal ── */}
      <button
        type="button"
        onClick={() => setShowSettings(true)}
        className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
      >
        <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
          <QrCode size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.qrSettings.settingsTitle}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.settingsDesc}</p>
        </div>
        <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden="true" />
      </button>

      {/* ── QR settings modal ── */}
      {showSettings && (
        <AnimatedModal
          onClose={() => setShowSettings(false)}
          overlayClass="z-50"
          cardClass="max-w-sm"
          ariaLabelledby="qr-settings-modal-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 id="qr-settings-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t.qrSettings.settingsModalTitle}
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

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50 mt-4">
                {/* 1. Custom name — taps into name edit modal */}
                <button
                  type="button"
                  onClick={handleOpenNameModal}
                  className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                      <UserPen size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.customNameTitle}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.customNameDesc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {customName.trim() && (
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-20">{customName.trim()}</span>
                    )}
                    <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                  </div>
                </button>

                {/* 2. Bank icon toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={bankIconEnabled}
                  onClick={handleToggleLogo}
                  className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center shrink-0">
                      <QrCode size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.logoTitle}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.logoDesc}</p>
                    </div>
                  </div>
                  {toggleSwitch(bankIconEnabled)}
                </button>

                {/* 3. Show bank name toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={showBankName}
                  onClick={handleToggleBankName}
                  className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                      <Landmark size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.institutionNameTitle}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.institutionNameDesc}</p>
                    </div>
                  </div>
                  {toggleSwitch(showBankName)}
                </button>

                {/* 4. Show account number toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAccount}
                  onClick={handleToggleAccount}
                  className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center shrink-0">
                      <CreditCard size={18} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.showAccountTitle}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.showAccountDesc}</p>
                    </div>
                  </div>
                  {toggleSwitch(showAccount)}
                </button>

                {/* 5. QR Code appearance — opens style modal */}
                <button
                  type="button"
                  onClick={() => setShowStyleModal(true)}
                  className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      <Shapes size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.styleTitle}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{styleSummary}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden="true" />
                </button>
              </div>

              <div className="px-5 pb-5 pt-3">
                <button
                  type="button"
                  onClick={requestClose}
                  className="w-full py-3.5 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.done}
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}

      {/* ── Style modal — rendered above settings modal ── */}
      {showStyleModal && (
        <AnimatedModal
          onClose={() => setShowStyleModal(false)}
          overlayClass="z-[60]"
          cardClass="max-w-sm p-6"
          ariaLabelledby="style-modal-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 id="style-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t.qrSettings.styleTitle}
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

              <div className="space-y-5">
                {/* Dot style */}
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t.qrSettings.dotStyleTitle}</p>
                  <div className="flex gap-2">
                    {(['square', 'rounded', 'dots'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleSetDotStyle(style)}
                        aria-pressed={dotStyle === style}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-[background-color,border-color,color] duration-150 border ${
                          dotStyle === style
                            ? 'border-transparent text-white'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
                        }`}
                        style={dotStyle === style ? { backgroundColor: 'var(--ca)' } : undefined}
                      >
                        {style === 'square' ? t.qrSettings.dotStyleSquare
                          : style === 'rounded' ? t.qrSettings.dotStyleRounded
                          : t.qrSettings.dotStyleDots}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Eye style */}
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{t.qrSettings.eyeStyleTitle}</p>
                  <div className="flex gap-2">
                    {(['square', 'rounded'] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleSetEyeStyle(style)}
                        aria-pressed={eyeStyle === style}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-[background-color,border-color,color] duration-150 border ${
                          eyeStyle === style
                            ? 'border-transparent text-white'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500'
                        }`}
                        style={eyeStyle === style ? { backgroundColor: 'var(--ca)' } : undefined}
                      >
                        {style === 'square' ? t.qrSettings.eyeStyleSquare : t.qrSettings.eyeStyleRounded}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={requestClose}
                className="w-full py-3.5 mt-6 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
              >
                {t.common.done}
              </button>
            </>
          )}
        </AnimatedModal>
      )}

      {/* ── Name edit modal — rendered above settings modal ── */}
      {showNameModal && (
        <AnimatedModal
          onClose={() => setShowNameModal(false)}
          overlayClass="z-[60]"
          cardClass="max-w-sm p-6"
          ariaLabelledby="custom-name-modal-title"
          initialFocusRef={allowAutoFocus ? inputRef : undefined}
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
                  name="qrCustomName"
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
                  className="w-full bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-4 pr-14 text-base text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100 focus-visible:border-zinc-900 dark:focus-visible:border-zinc-100 input-transition shadow-xs"
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
