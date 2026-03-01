import { useState } from 'react';
import { ShieldAlert, Eye, TriangleAlert, Info, X } from 'lucide-react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { useLocaleStore } from '../../stores/useLocaleStore';

/**
 * Privacy & safety information – a single settings row that opens a modal
 * with privacy notice, safety reminder and scam-awareness tips.
 */
export const SafetySection = () => {
  const [showInfo, setShowInfo] = useState(false);
  const t = useLocaleStore((s) => s.t);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        {t.safety.sectionTitle}
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowInfo(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Info size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.safety.infoTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.safety.infoDesc}
            </p>
          </div>
        </button>
      </div>

      {showInfo && (
        <AnimatedModal
          onClose={() => setShowInfo(false)}
          overlayClass="z-50"
          cardClass="max-w-sm"
          ariaLabelledby="safety-modal-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 id="safety-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t.safety.modalTitle}
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

              <div className="p-5 pt-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Eye size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.safety.privacyTitle}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {t.safety.privacyDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert size={18} className="text-orange-600 dark:text-orange-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.safety.securityTitle}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {t.safety.securityDesc}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <TriangleAlert size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.safety.scamTitle}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {t.safety.scamDesc}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5">
                <button
                  type="button"
                  onClick={requestClose}
                  className="w-full py-3.5 rounded-xl font-semibold btn-accent active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
                >
                  {t.common.understand}
                </button>
              </div>
            </>
          )}
        </AnimatedModal>
      )}
    </div>
  );
};
