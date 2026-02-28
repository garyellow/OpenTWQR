import { readFile, writeFile } from 'node:fs/promises';

/* ── Source URLs ── */

const BANKING_BUREAU_BASE_URL =
  'https://www.banking.gov.tw/ch/home.jsp?id=606&parentpath=0,590,604&mcustomize=FscSearch_BankType.jsp';

/** Fallback sources when the Banking Bureau is unreachable. */
const FISC_SOURCE_URL = 'https://www.fisc.com.tw/TC/OPENDATA/Comm1_MEMBER.xml';
const FSC_SOURCE_URL =
  'https://stat.fsc.gov.tw/FSC_OAS3_RESTORE/api/CSV_EXPORT?TableID=B14&OUTPUT_FILE=Y';

const OUTPUT_TS = 'src/data/banks.generated.ts';
const OUTPUT_JSON = 'public/data/banks.latest.json';

/**
 * Banking Bureau institution types to scrape. Processed in priority order;
 * the first occurrence of a code wins (e.g. type 1 overrides type H).
 *
 * | Code | Label                | Description                              |
 * |------|----------------------|------------------------------------------|
 * | 1    | 本國銀行             | Domestic banks                           |
 * | 3    | 外國銀行在臺分行     | Foreign bank branches in Taiwan          |
 * | 5    | 信用合作社           | Credit cooperatives                      |
 * | T    | 大陸地區銀行在臺分行 | Chinese bank branches in Taiwan          |
 * | H    | 電子支付機構         | E-payment institutions (standalone only) |
 */
const BANKING_BUREAU_TYPES = [
  { type: '1', label: '本國銀行' },
  { type: '3', label: '外國銀行在臺分行' },
  { type: '5', label: '信用合作社' },
  { type: 'T', label: '大陸地區銀行在臺分行' },
  { type: 'H', label: '電子支付機構' },
];

/**
 * FISC business types used in the fallback path.
 * Their union covers all institutions that can receive interbank transfers.
 */
const FISC_TARGET_BUSINESSES = [
  '跨行自動化服務機器業務(金融卡)',
  '通匯業務-入戶電匯',
];

/**
 * Manual entries for institutions NOT supervised by the FSC.
 * These never appear on the Banking Bureau or FSC data.
 */
const MANUAL_ENTRIES = [
  { code: '018', name: '全國農業金庫股份有限公司', url: 'https://www.agribank.com.tw' },
  { code: '700', name: '中華郵政股份有限公司', url: 'https://www.post.gov.tw' },
];

/**
 * Codes to exclude even if they appear in any source. These are infrastructure
 * or government entities that individual users cannot transfer to.
 */
const EXCLUDED_CODES = new Set([
  '000', // 中央銀行國庫局
  '995', // 關貿網路
  '996', // 財政部國庫署
]);

/** Sanity-check: these codes MUST appear in the final output. */
const REQUIRED_CODES = ['004', '700', '822'];

/* ── Helpers ── */

const normalizeName = (name) =>
  name.replace(/\s+/g, ' ').replace(/\u3000/g, ' ').trim();

/**
 * Ensure a URL uses HTTPS. Normalise to origin only (strip paths, query strings).
 * CSP restricts img-src to https: only, so HTTP URLs are upgraded.
 */
const ensureHttps = (rawUrl) => {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);
    if (url.protocol === 'http:') url.protocol = 'https:';
    if (url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
};

/* ── Banking Bureau HTML scraper (primary source) ── */

/**
 * Fetch one page of results for a given institution type.
 * Returns parsed entries: `{ code, name, url? }[]`.
 *
 * The Banking Bureau renders 15 entries per page via server-side JSP.
 * Pagination uses POST with `page` and `pagesize` form fields.
 * Page 1 can be fetched with GET; subsequent pages require POST.
 */
const fetchBankingBureauPage = async (type, page) => {
  const response =
    page <= 1
      ? await fetch(
          `${BANKING_BUREAU_BASE_URL}&type=${encodeURIComponent(type)}&display=false`,
          {
            headers: { 'user-agent': 'OpenTWQR Bank Updater' },
            signal: AbortSignal.timeout(15_000),
          },
        )
      : await fetch(BANKING_BUREAU_BASE_URL, {
          method: 'POST',
          headers: {
            'user-agent': 'OpenTWQR Bank Updater',
            'content-type': 'application/x-www-form-urlencoded',
          },
          body: `type=${encodeURIComponent(type)}&display=false&page=${page}&pagesize=15`,
          signal: AbortSignal.timeout(15_000),
        });

  if (!response.ok) {
    throw new Error(`Banking Bureau fetch failed: ${response.status}`);
  }

  const html = await response.text();

  /**
   * Each entry on the list page has this structure:
   *
   *   <a href="...bank_no=CODE..." title="NAME">NAME</a>
   *   ...
   *   <div class="furl_con">
   *     <a href="URL" target="_blank" ...>
   *
   * We extract code + name from the link, then the first http(s) URL
   * from the furl_con block that follows.
   */
  const entries = [];
  const entryPattern =
    /bank_no=(\d{3})[^"]*"[^>]*title="([^"]+)"[\s\S]*?<div class="furl_con">([\s\S]*?)<\/div>/g;

  let match = entryPattern.exec(html);
  while (match) {
    const code = match[1];
    const name = normalizeName(match[2]);
    const urlBlock = match[3];
    const urlMatch = urlBlock.match(/href="(https?:\/\/[^"]+)"/);
    const url = urlMatch ? ensureHttps(urlMatch[1]) : undefined;

    if (/^\d{3}$/.test(code) && name && !EXCLUDED_CODES.has(code)) {
      entries.push({ code, name, url });
    }

    match = entryPattern.exec(html);
  }

  return entries;
};

/**
 * Fetch ALL pages for a given institution type.
 * Stops when a page returns no new codes (the server wraps around to page 1
 * instead of returning empty results for out-of-range pages).
 */
const fetchBankingBureauType = async (type, label) => {
  const all = [];
  const seen = new Set();
  let page = 1;

  while (page <= 50) {
    const entries = await fetchBankingBureauPage(type, page);
    if (entries.length === 0) break;

    // Detect server wrap-around: if all codes on this page were already seen,
    // the server is repeating earlier pages — stop here.
    const newEntries = entries.filter((e) => !seen.has(e.code));
    if (newEntries.length === 0) break;

    for (const entry of entries) seen.add(entry.code);
    all.push(...newEntries);
    page++;

    if (entries.length < 15) break;
  }

  console.log(`  type=${type} (${label}): ${all.length} entries`);
  return all;
};

/**
 * Scrape the Banking Bureau for all relevant institution types.
 * Returns a deduplicated Map: code → { name, url? }.
 */
const fetchFromBankingBureau = async () => {
  console.log('Banking Bureau: fetching institution list...');

  const bankMap = new Map();

  for (const { type, label } of BANKING_BUREAU_TYPES) {
    const entries = await fetchBankingBureauType(type, label);

    for (const entry of entries) {
      if (!bankMap.has(entry.code)) {
        bankMap.set(entry.code, { name: entry.name, url: entry.url });
      }
    }
  }

  console.log(`Banking Bureau: ${bankMap.size} unique institutions`);
  return bankMap;
};

/* ── FISC XML parser (fallback: bank codes + names) ── */

const readTag = (xml, tagName) => {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(new RegExp(`<${escaped}>([\\s\\S]*?)<\\/${escaped}>`));
  return match?.[1]?.trim() ?? '';
};

const parseFiscBanks = (xml) => {
  const recordPattern = /<record>([\s\S]*?)<\/record>/g;
  const targetSet = new Set(FISC_TARGET_BUSINESSES);
  const nameCountByCode = new Map();

  let recordMatch = recordPattern.exec(xml);
  while (recordMatch) {
    const record = recordMatch[1];
    const business = readTag(record, '業務別');
    const code = readTag(record, '銀行代號BIC');
    const name = normalizeName(readTag(record, '金融機構名稱'));

    if (targetSet.has(business) && /^\d{3}$/.test(code) && name && !EXCLUDED_CODES.has(code)) {
      if (!nameCountByCode.has(code)) nameCountByCode.set(code, new Map());
      const counts = nameCountByCode.get(code);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    recordMatch = recordPattern.exec(xml);
  }

  const banks = [];
  for (const [code, variants] of nameCountByCode.entries()) {
    const sorted = [...variants.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      if (b[0].length !== a[0].length) return b[0].length - a[0].length;
      return a[0].localeCompare(b[0], 'zh-Hant');
    });
    banks.push({ code, name: sorted[0][0] });
  }

  return banks.sort((a, b) => Number(a.code) - Number(b.code));
};

/* ── FSC CSV parser (fallback: bank codes → website URLs) ── */

/**
 * Parse the FSC "金融機構基本資料" CSV and extract head-office rows
 * (where 機構代號 is empty) to get the mapping: 總機構代號 → 金融機構網址.
 */
const parseFscUrls = (csvText) => {
  const urlMap = new Map();
  const lines = csvText.split(/\r?\n/);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(',');
    if (fields.length < 8) continue;

    const headCode = fields[0].trim();
    const branchCode = fields[1].trim();
    const rawUrl = fields[7]?.trim() || '';

    if (!/^\d{3}$/.test(headCode) || branchCode || !rawUrl) continue;

    const httpsUrl = ensureHttps(rawUrl);
    if (httpsUrl) urlMap.set(headCode, httpsUrl);
  }

  return urlMap;
};

/* ── Fallback path: FISC + FSC (legacy approach) ── */

const fetchFromFallback = async () => {
  console.log('Fallback: fetching from FISC XML + FSC CSV...');

  const fiscResponse = await fetch(FISC_SOURCE_URL, {
    headers: { 'user-agent': 'OpenTWQR Bank Updater' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!fiscResponse.ok) {
    throw new Error(`FISC XML fetch failed: ${fiscResponse.status}`);
  }

  const xml = await fiscResponse.text();
  const banks = parseFiscBanks(xml);

  if (banks.length < 50) {
    throw new Error(`FISC parse returned too few entries (${banks.length})`);
  }

  console.log(`  FISC XML: ${banks.length} institutions`);

  let urlMap = new Map();
  try {
    const fscResponse = await fetch(FSC_SOURCE_URL, {
      headers: { 'user-agent': 'OpenTWQR Bank Updater' },
      signal: AbortSignal.timeout(30_000),
    });

    if (fscResponse.ok) {
      urlMap = parseFscUrls(await fscResponse.text());
      console.log(`  FSC CSV: ${urlMap.size} URLs`);
    } else {
      console.warn(`  FSC CSV fetch failed (${fscResponse.status}), continuing without URLs`);
    }
  } catch (err) {
    console.warn(`  FSC CSV error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const bankMap = new Map();
  for (const bank of banks) {
    bankMap.set(bank.code, { name: bank.name, url: urlMap.get(bank.code) });
  }

  return bankMap;
};

/* ── Output generation ── */

const toTypeScript = (banks, source, nowIso) => {
  const bankLines = banks.map((bank) => {
    const urlPart = bank.url ? `, url: '${bank.url}'` : '';
    return `  { code: '${bank.code}', name: '${bank.name}'${urlPart} },`;
  });

  return `import type { Bank } from '../types';

export const BANKS_SOURCE = {
  provider: '${source.provider}',
  url: '${source.url}',
  generatedAt: '${nowIso}',
  count: ${banks.length},
} as const;

export const BANKS: Bank[] = [
${bankLines.join('\n')}
];
`;
};

/* ── Main ── */

const main = async () => {
  let bankMap;
  let sourceProvider;
  let sourceUrl;

  // 1. Try Banking Bureau as primary source
  try {
    bankMap = await fetchFromBankingBureau();

    if (bankMap.size < 30) {
      throw new Error(`Banking Bureau returned too few entries (${bankMap.size})`);
    }

    sourceProvider = '金融監督管理委員會銀行局';
    sourceUrl = BANKING_BUREAU_BASE_URL.split('?')[0];
  } catch (err) {
    console.warn(
      `Banking Bureau failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    console.warn('Falling back to FISC + FSC...');

    bankMap = await fetchFromFallback();
    sourceProvider = '財金資訊股份有限公司（FISC）＋金融監督管理委員會（FSC）';
    sourceUrl = FISC_SOURCE_URL;
  }

  // 2. Add manual entries for non-FSC institutions
  for (const entry of MANUAL_ENTRIES) {
    if (!bankMap.has(entry.code) && !EXCLUDED_CODES.has(entry.code)) {
      bankMap.set(entry.code, { name: entry.name, url: ensureHttps(entry.url) });
      console.log(`  Manual: added ${entry.code} ${entry.name}`);
    }
  }

  // 3. Apply manual URL overrides (fill in missing URLs)
  for (const entry of MANUAL_ENTRIES) {
    if (bankMap.has(entry.code) && !bankMap.get(entry.code).url && entry.url) {
      bankMap.get(entry.code).url = ensureHttps(entry.url);
    }
  }

  // 4. Build sorted array
  const banks = [...bankMap.entries()]
    .map(([code, data]) => ({
      code,
      name: data.name,
      ...(data.url ? { url: data.url } : {}),
    }))
    .sort((a, b) => Number(a.code) - Number(b.code));

  // 5. Validate
  if (banks.length === 0) {
    throw new Error('No bank data produced.');
  }

  for (const code of REQUIRED_CODES) {
    if (!banks.some((b) => b.code === code)) {
      throw new Error(`Required bank code missing from dataset: ${code}`);
    }
  }

  // 6. Check if data has actually changed
  let existingBanks = null;
  try {
    const existingJson = JSON.parse(await readFile(OUTPUT_JSON, 'utf8'));
    existingBanks = existingJson.banks ?? null;
  } catch {
    // File doesn't exist yet
  }

  const hasChanged =
    existingBanks === null ||
    JSON.stringify(banks) !== JSON.stringify(existingBanks);

  if (!hasChanged) {
    console.log(`No changes detected (${banks.length} entries). Skipping update.`);
    return;
  }

  // 7. Write output files
  const nowIso = new Date().toISOString();
  const source = { provider: sourceProvider, url: sourceUrl };

  const tsContent = toTypeScript(banks, source, nowIso);
  const jsonContent = JSON.stringify(
    {
      source: {
        provider: sourceProvider,
        url: sourceUrl,
        generatedAt: nowIso,
        count: banks.length,
      },
      banks,
    },
    null,
    2,
  );

  await writeFile(OUTPUT_TS, tsContent, 'utf8');
  await writeFile(OUTPUT_JSON, `${jsonContent}\n`, 'utf8');

  console.log(`Updated bank list: ${banks.length} entries`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
