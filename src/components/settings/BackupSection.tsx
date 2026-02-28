import { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';

/**
 * Import/Export section for the Settings page.
 * Provides encrypted backup string generation and import with password support.
 */
export const BackupSection = () => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  return (
    <div>
      <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-3">
        資料備份
      </h2>
      <div className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-xs overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
        <button
          type="button"
          onClick={() => setShowExport(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Upload size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">匯出帳戶</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              產生加密字串，可複製保存或傳送
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="w-full flex items-center gap-3 p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-100"
        >
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Download size={18} className="text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">匯入帳戶</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              貼上加密字串以還原帳戶資料
            </p>
          </div>
        </button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
};
