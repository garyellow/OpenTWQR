import { useState, useMemo } from 'react';
import { Download, Upload } from 'lucide-react';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { InfoTip } from '../ui/InfoTip';
import { useLocaleStore } from '../../stores/useLocaleStore';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true;

/**
 * Import/Export section for the Settings page.
 * Uses the unified category-based backup system — the user
 * chooses what to include (accounts, settings, or both) in the dialog itself.
 */
export const BackupSection = () => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const t = useLocaleStore((s) => s.t);

  /** Show the iOS-specific warning only on iOS Safari, not in standalone mode. */
  const showIOSWarning = useMemo(() => isIOS() && !isStandalone(), []);

  return (
    <div>
      {/* Section header — triangle icon opens storage-risk modal */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t.backup.sectionTitle}
        </h2>
        <InfoTip variant="caution" title={t.backup.storageWarningTitle} size={13}>
          <div className="space-y-2.5 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <p>{t.backup.storageWarning}</p>
            {showIOSWarning && (
              <p className="text-amber-600 dark:text-amber-400">{t.backup.storageWarningIOS}</p>
            )}
          </div>
        </InfoTip>
      </div>

      <div className="app-surface overflow-hidden shadow-xs divide-y divide-zinc-100 dark:divide-zinc-800/50">
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
            <Upload size={18} className="text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.backup.exportTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.backup.exportDesc}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center">
            <Download size={18} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{t.backup.importTitle}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t.backup.importDesc}
            </p>
          </div>
        </button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
};
