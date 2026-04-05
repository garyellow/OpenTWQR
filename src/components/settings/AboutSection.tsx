import { useState, useCallback, useEffect, useRef } from 'react';
import { Heart, Info, RefreshCw, Scale, ShieldAlert, Eye, TriangleAlert, X } from 'lucide-react';
import { AnimatedModal } from '../ui/AnimatedModal';
import { useLocaleStore } from '../../stores/useLocaleStore';

/** GitHub logo from Simple Icons (MIT). Avoids deprecated lucide brand icons. */
const GithubIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

/**
 * "About" section for the Settings page.
 * Provides links to the Ko-fi sponsor page and the GitHub repository.
 */
export const AboutSection = () => {
  const t = useLocaleStore((s) => s.t);
  const [showSafety, setShowSafety] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [checkState, setCheckState] = useState<'idle' | 'checking' | 'up-to-date' | 'found' | 'error'>('idle');
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleCheckUpdate = useCallback(async () => {
    if (checkState === 'checking') return;

    // If update already found, just reload the page — new SW is already active.
    if (checkState === 'found') {
      window.location.reload();
      return;
    }

    setCheckState('checking');
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (!reg) {
        setCheckState('error');
        return;
      }

      const hadWaiting = Boolean(reg.waiting);
      let updateFound = false;
      const onUpdateFound = () => {
        updateFound = true;
      };

      reg.addEventListener('updatefound', onUpdateFound);
      await reg.update();
      reg.removeEventListener('updatefound', onUpdateFound);

      if (hadWaiting || updateFound || Boolean(reg.waiting || reg.installing)) {
        setCheckState('found');
        return;
      }
      setCheckState('up-to-date');
    } catch {
      setCheckState('error');
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
    }
    resetTimerRef.current = window.setTimeout(() => setCheckState('idle'), 3000);
  }, [checkState]);

  const checkLabel = {
    idle: t.about.checkUpdateDesc,
    checking: t.about.checkingUpdate,
    'up-to-date': t.about.upToDate,
    found: t.about.updateAvailable,
    error: t.about.checkFailed,
  }[checkState];

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        {t.about.sectionTitle}
      </h2>
      <div className="app-surface overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/50">
        <a
          href="https://ko-fi.com/garyellow"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center">
            <Heart size={18} className="text-pink-600 dark:text-pink-400" aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.about.sponsorTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.about.sponsorDesc}
            </p>
          </div>
        </a>

        <a
          href="https://github.com/garyellow/OpenTWQR"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <GithubIcon size={18} className="text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.about.githubTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.about.githubDesc}
            </p>
          </div>
        </a>

        {/* Privacy & Security */}
        <button
          type="button"
          onClick={() => setShowSafety(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <ShieldAlert size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.safety.infoTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.safety.infoDesc}
            </p>
          </div>
        </button>

        {/* Disclaimer */}
        <button
          type="button"
          onClick={() => setShowDisclaimer(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Scale size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.about.disclaimerTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.about.disclaimerHint}
            </p>
          </div>
        </button>

        {/* Version info */}
        <div className="w-full flex items-center gap-3 p-4">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center">
            <Info size={18} className="text-violet-600 dark:text-violet-400" aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.about.versionTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
              {t.about.versionDesc(__BUILD_HASH__)}
            </p>
          </div>
        </div>

        {/* Check for updates */}
        <button
          type="button"
          onClick={handleCheckUpdate}
          disabled={checkState === 'checking'}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <RefreshCw size={18} className={`text-emerald-600 dark:text-emerald-400 ${checkState === 'checking' ? 'animate-spin' : checkState === 'found' ? 'animate-pulse' : ''}`} aria-hidden="true" />
          </div>
          <div className="text-left flex-1">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.about.checkUpdateTitle}</p>
            <p className={`text-xs mt-0.5 ${checkState === 'found' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'}`}>
              {checkLabel}
            </p>
          </div>
        </button>
      </div>

      {/* Privacy & Security modal */}
      {showSafety && (
        <AnimatedModal
          onClose={() => setShowSafety(false)}
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

      {/* Disclaimer modal */}
      {showDisclaimer && (
        <AnimatedModal
          onClose={() => setShowDisclaimer(false)}
          overlayClass="z-50"
          cardClass="max-w-sm"
          ariaLabelledby="disclaimer-modal-title"
        >
          {(requestClose) => (
            <>
              <div className="flex items-center justify-between p-5 pb-0">
                <h2 id="disclaimer-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {t.about.disclaimerTitle}
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

              <div className="p-5 pt-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Scale size={18} className="text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {t.about.disclaimerDesc}
                  </p>
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
