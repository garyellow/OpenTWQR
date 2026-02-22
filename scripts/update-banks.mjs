import { writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://www.fisc.com.tw/TC/OPENDATA/Comm1_MEMBER.xml';
const OUTPUT_TS = 'src/data/banks.generated.ts';
const OUTPUT_JSON = 'public/data/banks.latest.json';
const TARGET_BUSINESS = '跨行自動化服務機器業務(金融卡)';
const REQUIRED_CODES = ['004', '700', '822'];

const nowIso = new Date().toISOString();

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

const parseBanks = (xml) => {
  const recordMatcher = /<record>([\s\S]*?)<\/record>/g;
  const nameCountByCode = new Map();
  let recordMatch = recordMatcher.exec(xml);

  while (recordMatch) {
    const record = recordMatch[1];
    const business = readTag(record, '業務別');
    const code = readTag(record, '銀行代號BIC');
    const name = normalizeName(readTag(record, '金融機構名稱'));

    if (business !== TARGET_BUSINESS || !/^\d{3}$/.test(code) || !name) {
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

const toTypeScript = (banks) => {
  const bankLines = banks.map((bank) => `  { code: '${bank.code}', name: '${bank.name}' },`);

  return `import type { Bank } from '../types';

export const BANKS_SOURCE = {
  provider: '財金資訊股份有限公司（FISC）',
  url: '${SOURCE_URL}',
  business: '${TARGET_BUSINESS}',
  generatedAt: '${nowIso}',
  count: ${banks.length},
} as const;

export const BANKS: Bank[] = [
${bankLines.join('\n')}
];
`;
};

const main = async () => {
  const response = await fetch(SOURCE_URL, {
    headers: {
      'user-agent': 'OpenTWQR Bank Updater',
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch source XML: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const banks = parseBanks(xml);

  if (banks.length === 0) {
    throw new Error('No bank data parsed from official source.');
  }

  if (banks.length < 50) {
    throw new Error(`Parsed bank entries too low (${banks.length}), possible upstream format change.`);
  }

  for (const code of REQUIRED_CODES) {
    if (!banks.some((bank) => bank.code === code)) {
      throw new Error(`Required bank code missing from dataset: ${code}`);
    }
  }

  const tsContent = toTypeScript(banks);
  const jsonContent = JSON.stringify(
    {
      source: {
        provider: '財金資訊股份有限公司（FISC）',
        url: SOURCE_URL,
        business: TARGET_BUSINESS,
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
