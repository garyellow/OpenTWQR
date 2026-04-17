import { useState, useCallback, useRef, useEffect } from 'react';
import { QrCode, UserPlus, Share2 } from 'lucide-react';
import { useLocaleStore } from '../../stores/useLocaleStore';
import { useScrollLock } from '../../hooks/useScrollLock';

const ONBOARDING_KEY = 'opentwqr-onboarding-done';

const steps = [
  { icon: QrCode, colorClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-50 dark:bg-blue-500/10' },
  { icon: UserPlus, colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-500/10' },
  { icon: Share2, colorClass: 'text-violet-600 dark:text-violet-400', bgClass: 'bg-violet-50 dark:bg-violet-500/10' },
] as const;

/**
 * Full-screen onboarding overlay shown on first visit.
 * 3 steps with skip / next / get-started. Persists completion in localStorage.
 */
export const OnboardingOverlay = () => {
  const t = useLocaleStore((s) => s.t);
  const [show, setShow] = useState(() => {
    try {
      return !localStorage.getItem(ONBOARDING_KEY);
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const settledRef = useRef(false);

  useScrollLock(show);

  const markDone = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* noop */ }
    settledRef.current = false;
    setIsExiting(true);
  }, []);

  const handleNext = useCallback(() => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      markDone();
    }
  }, [step, markDone]);

  const handleAnimationEnd = useCallback(() => {
    if (!isExiting || settledRef.current) return;
    settledRef.current = true;
    setShow(false);
  }, [isExiting]);

  // Safety fallback: close overlay even if animationend never fires
  // (e.g. prefers-reduced-motion, Chrome throttling, or tab backgrounding).
  // 400 ms > exit animation duration (300 ms) to avoid truncating the animation.
  useEffect(() => {
    if (!isExiting) return;
    const id = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      setShow(false);
    }, 400);
    return () => clearTimeout(id);
  }, [isExiting]);

  if (!show) return null;

  const stepTexts = [
    { title: t.onboarding.step1Title, desc: t.onboarding.step1Desc },
    { title: t.onboarding.step2Title, desc: t.onboarding.step2Desc },
    { title: t.onboarding.step3Title, desc: t.onboarding.step3Desc },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div
      className={`fixed inset-0 z-100 flex items-center justify-center bg-white dark:bg-zinc-950 motion-reduce:animate-none ${
        isExiting ? 'animate-out fade-out duration-300' : 'animate-in fade-in duration-300'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="w-full max-w-sm mx-auto px-8 flex flex-col items-center text-center">
        {/* Icon */}
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-colors duration-300 ${current.bgClass}`}
          key={step}
        >
          <Icon size={48} className={`transition-colors duration-300 ${current.colorClass}`} aria-hidden="true" />
        </div>

        {/* Title & description */}
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          {stepTexts[step].title}
        </h1>
        <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed mb-10 text-pretty">
          {stepTexts[step].desc}
        </p>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8" aria-hidden="true">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-[width,background-color] duration-300 ${
                i === step
                  ? 'w-8'
                  : 'w-2 bg-zinc-200 dark:bg-zinc-700'
              }`}
              style={i === step ? { backgroundColor: 'var(--ca)' } : undefined}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="w-full space-y-3">
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-4 btn-accent font-semibold rounded-xl text-lg active:scale-98 action-transition shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            {isLast ? t.onboarding.getStarted : t.onboarding.next}
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={markDone}
              className="w-full py-3 font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 active:scale-98 action-transition focus-visible:outline-hidden rounded-xl"
            >
              {t.onboarding.skip}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
