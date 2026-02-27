import { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ImportDialog } from '../components/settings/BackupSection';

/**
 * Landing page for the Web Share Target API.
 *
 * When another app shares text to the installed OpenTWQR PWA, the browser opens
 * `/import?text=<shared-text>`. This page extracts the shared payload and
 * immediately presents the {@link ImportDialog} with the text pre-filled,
 * giving the user a one-tap import experience.
 *
 * The `text`, `title`, and `url` query parameters are inspected in order;
 * the first non-empty value that looks like an OTWQR backup string wins.
 * If none match, the raw `text` parameter is used as-is so the user can
 * still verify and edit it.
 */
export const ImportPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const sharedText = useMemo(() => {
    // Prefer explicit text, then fall back to url (some apps put the
    // content in the url field instead).
    const candidates = [
      params.get('text'),
      params.get('url'),
      params.get('title'),
    ];

    // Pick the first candidate that looks like an OTWQR backup string
    for (const c of candidates) {
      if (c && c.trim().startsWith('OTWQR')) return c.trim();
    }

    // Fall back to raw text even if it doesn't look like a backup
    return candidates.find((c) => c?.trim())?.trim() ?? '';
  }, [params]);

  const handleClose = () => {
    // Navigate to home page after closing the dialog
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-svh flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-safe pb-safe">
      <ImportDialog onClose={handleClose} initialText={sharedText} />
    </div>
  );
};
