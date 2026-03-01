import { useCallback } from 'react';
import { QrCode, Tag, Landmark } from 'lucide-react';
import { useQRSettingsStore, type QRLogoType } from '../../stores/useQRSettingsStore';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { haptic } from '../../utils/haptics';

/**
 * QR Code display settings — centre logo type, custom name, and bank name toggle.
 *
 * Follows the same card layout pattern as PersonalizationSection.
 */
export const QRCodeSection = () => {
  const t = useLocaleStore((s) => s.t);

  const logoType = useQRSettingsStore((s) => s.logoType);
  const showBankName = useQRSettingsStore((s) => s.showBankName);
  const customName = useQRSettingsStore((s) => s.customName);
  const setLogoType = useQRSettingsStore((s) => s.setLogoType);
  const setShowBankName = useQRSettingsStore((s) => s.setShowBankName);
  const setCustomName = useQRSettingsStore((s) => s.setCustomName);

  const handleLogoType = useCallback(
    (type: QRLogoType) => {
      haptic();
      setLogoType(type);
    },
    [setLogoType],
  );

  const handleToggleBankName = useCallback(() => {
    haptic();
    setShowBankName(!showBankName);
  }, [showBankName, setShowBankName]);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        {t.qrSettings.sectionTitle}
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">

        {/* ── Logo type selection ── */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center">
              <QrCode size={18} className="text-teal-600 dark:text-teal-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.logoTitle}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.logoDesc}</p>
            </div>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label={t.qrSettings.logoTitle}>
            <button
              type="button"
              role="radio"
              aria-checked={logoType === 'opentwqr'}
              onClick={() => handleLogoType('opentwqr')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                logoType === 'opentwqr'
                  ? 'chip-accent shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {t.qrSettings.logoOpenTWQR}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={logoType === 'bank'}
              onClick={() => handleLogoType('bank')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium action-transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950 ${
                logoType === 'bank'
                  ? 'chip-accent shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {t.qrSettings.logoBankIcon}
            </button>
          </div>
        </div>

        {/* ── Custom name ── */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
              <Tag size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t.qrSettings.customNameTitle}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{t.qrSettings.customNameDesc}</p>
            </div>
          </div>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t.qrSettings.customNamePlaceholder}
            maxLength={20}
            autoComplete="off"
            className="w-full px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
          />
        </div>

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

      </div>
    </div>
  );
};
