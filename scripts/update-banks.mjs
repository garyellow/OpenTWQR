import { readFile, writeFile } from 'node:fs/promises';

const FISC_SOURCE_URL = 'https://www.fisc.com.tw/TC/OPENDATA/Comm1_MEMBER.xml';
const FSC_SOURCE_URL =
  'https://stat.fsc.gov.tw/FSC_OAS3_RESTORE/api/CSV_EXPORT?TableID=B14&OUTPUT_FILE=Y';
const OUTPUT_TS = 'src/data/banks.generated.ts';
const OUTPUT_JSON = 'public/data/banks.latest.json';

/**
 * FISC business types to include. The union of these two categories covers
 * all institutions that can receive interbank transfers:
 *   - 跨行自動化服務機器業務(金融卡): ATM / debit-card interbank services
 *   - 通匯業務-入戶電匯: inbound wire-transfer services
 */
const TARGET_BUSINESSES = [
  '跨行自動化服務機器業務(金融卡)',
  '通匯業務-入戶電匯',
];

/**
 * Codes to exclude even if they appear in FISC data. These are infrastructure
 * or government entities that individual users cannot transfer to.
 */
const EXCLUDED_CODES = new Set([
  '000', // 中央銀行國庫局
  '060', // 兆豐票券金融
  '061', // 中華票券金融
  '062', // 國際票券金融
  '066', // 萬通票券金融
  '372', // 大慶票券金融
  '995', // 關貿網路
  '996', // 財政部國庫署
]);

const REQUIRED_CODES = ['004', '700', '822'];

/**
 * Manual fallback URLs for institutions that are NOT in FSC's open data
 * (e.g. supervised by agencies other than FSC).
 */
const MANUAL_URLS = new Map([
  ['018', 'https://www.agribank.com.tw'],  // 全國農業金庫 (農委會)
  ['700', 'https://www.post.gov.tw'],      // 中華郵政 (交通部)
]);

/* ── Helpers ── */

const readTag = (xml, tagName) => {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`<${escapedTag}>([\\s\\S]*?)<\\/${escapedTag}>`);
  const match = xml.match(matcher);
  return match?.[1]?.trim() ?? '';
};

const normalizeName = (name) => {
  return name
    .replace(/\s+/g, ' ')
    .replace(/\u3000/g, ' ')
    .trim();
};

/**
 * Ensure a URL uses HTTPS.
 * CSP restricts img-src to https: only, so HTTP URLs are upgraded.
 */
const ensureHttps = (rawUrl) => {
  if (!rawUrl) return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed);

    if (url.protocol === 'http:') {
      url.protocol = 'https:';
    }

    if (url.protocol !== 'https:') return undefined;

    // Normalise to origin only (strip paths, query strings)
    return url.origin;
  } catch {
    return undefined;
  }
};

/* ── FISC XML parser (bank codes + names) ── */

const parseBanks = (xml) => {
  const recordMatcher = /<record>([\s\S]*?)<\/record>/g;
  const nameCountByCode = new Map();
  const targetSet = new Set(TARGET_BUSINESSES);
  let recordMatch = recordMatcher.exec(xml);

  while (recordMatch) {
    const record = recordMatch[1];
    const business = readTag(record, '業務別');
    const code = readTag(record, '銀行代號BIC');
    const name = normalizeName(readTag(record, '金融機構名稱'));

    if (
      !targetSet.has(business) ||
      !/^\d{3}$/.test(code) ||
      !name ||
      EXCLUDED_CODES.has(code)
    ) {
      recordMatch = recordMatcher.exec(xml);
      continue;
    }

    if (!nameCountByCode.has(code)) {
      nameCountByCode.set(code, new Map());
    }

    const nameCount = nameCountByCode.get(code);
    nameCount.set(name, (nameCount.get(name) ?? 0) + 1);

    recordMatch = recordMatcher.exec(xml);
  }

  const banks = [];

  for (const [code, variants] of nameCountByCode.entries()) {
    const sortedVariants = [...variants.entries()].sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      if (right[0].length !== left[0].length) {
        return right[0].length - left[0].length;
      }

      return left[0].localeCompare(right[0], 'zh-Hant');
    });

    banks.push({ code, name: sortedVariants[0][0] });
  }

  return banks.sort((left, right) => Number(left.code) - Number(right.code));
};

/* ── FSC CSV parser (bank codes → website URLs) ── */

/**
 * Parse the FSC "金融機構基本資料" CSV and extract head-office rows
 * (where 機構代號 is empty) to get the mapping: 總機構代號 → 金融機構網址.
 *
 * CSV columns: 總機構代號,機構代號,機構名稱,地址,電話,負責人,異動日期,金融機構網址,公告日期
 */
const parseFscUrls = (csvText) => {
  const urlMap = new Map();
  const lines = csvText.split(/\r?\n/);

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV split — FSC data doesn't use quoted fields with commas
    const fields = line.split(',');
    if (fields.length < 8) continue;

    const headCode = fields[0].trim();        // 總機構代號
    const branchCode = fields[1].trim();      // 機構代號 (empty for head office)
    const rawUrl = fields[7]?.trim() || '';    // 金融機構網址

    // Only head-office rows (branchCode is empty) carry the website URL
    if (!/^\d{3}$/.test(headCode) || branchCode || !rawUrl) continue;

    const httpsUrl = ensureHttps(rawUrl);
    if (httpsUrl) {
      urlMap.set(headCode, httpsUrl);
    }
  }

  return urlMap;
};

/* ── Output generation ── */

const toTypeScript = (banks, nowIso) => {
  const bankLines = banks.map((bank) => {
    const urlPart = bank.url ? `, url: '${bank.url}'` : '';
    return `  { code: '${bank.code}', name: '${bank.name}'${urlPart} },`;
  });

  return `import type { Bank } from '../types';

export const BANKS_SOURCE = {
  provider: '財金資訊股份有限公司（FISC）＋金融監督管理委員會（FSC）',
  fiscUrl: '${FISC_SOURCE_URL}',
  fscUrl: '${FSC_SOURCE_URL}',
  businesses: ${JSON.stringify(TARGET_BUSINESSES)},
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
  // 1. Fetch FISC XML (bank codes + names)
  const fiscResponse = await fetch(FISC_SOURCE_URL, {
    headers: { 'user-agent': 'OpenTWQR Bank Updater' },
  });

  if (!fiscResponse.ok) {
    throw new Error(`Unable to fetch FISC XML: ${fiscResponse.status} ${fiscResponse.statusText}`);
  }

  const xml = await fiscResponse.text();
  const banks = parseBanks(xml);

  if (banks.length === 0) {
    throw new Error('No bank data parsed from FISC source.');
  }

  if (banks.length < 50) {
    throw new Error(`Parsed bank entries too low (${banks.length}), possible upstream format change.`);
  }

  for (const code of REQUIRED_CODES) {
    if (!banks.some((bank) => bank.code === code)) {
      throw new Error(`Required bank code missing from dataset: ${code}`);
    }
  }

  // 2. Fetch FSC CSV (bank website URLs) — non-critical, failure is tolerated
  let urlMap = new Map();

  try {
    const fscResponse = await fetch(FSC_SOURCE_URL, {
      headers: { 'user-agent': 'OpenTWQR Bank Updater' },
    });

    if (fscResponse.ok) {
      const csvText = await fscResponse.text();
      urlMap = parseFscUrls(csvText);
      console.log(`FSC CSV: parsed ${urlMap.size} bank website URLs`);
    } else {
      console.warn(`FSC CSV fetch failed (${fscResponse.status}), continuing without URLs`);
    }
  } catch (err) {
    console.warn(`FSC CSV fetch error: ${err instanceof Error ? err.message : String(err)}, continuing without URLs`);
  }

  // 3. Merge: attach URLs from FSC CSV to FISC bank list, then manual fallbacks
  for (const bank of banks) {
    const url = urlMap.get(bank.code) ?? MANUAL_URLS.get(bank.code);
    if (url) {
      bank.url = url;
    }
  }

  // 4. Check if data has actually changed
  let existingBanks = null;

  try {
    const existingJson = JSON.parse(await readFile(OUTPUT_JSON, 'utf8'));
    existingBanks = existingJson.banks ?? null;
  } catch {
    // File doesn't exist yet, proceed with write
  }

  const hasChanged =
    existingBanks === null ||
    JSON.stringify(banks) !== JSON.stringify(existingBanks);

  if (!hasChanged) {
    console.log(`No changes detected (${banks.length} entries). Skipping update.`);
    return;
  }

  const nowIso = new Date().toISOString();

  const tsContent = toTypeScript(banks, nowIso);
  const jsonContent = JSON.stringify(
    {
      source: {
        provider: '財金資訊股份有限公司（FISC）＋金融監督管理委員會（FSC）',
        fiscUrl: FISC_SOURCE_URL,
        fscUrl: FSC_SOURCE_URL,
        businesses: TARGET_BUSINESSES,
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
