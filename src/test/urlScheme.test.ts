import { describe, it, expect } from 'vitest';
import {
  buildBankUrl,
  buildIntentUrl,
  isIntentUrl,
  normalizeIntentUrl,
  parseIntentInput,
  parseManifestXml,
} from '../utils/urlScheme';
import type { UrlSchemeParams } from '../utils/urlScheme';

const baseParams: UrlSchemeParams = {
  bankCode: '812',
  account: '1234567890',
  paddedAccount: '0000001234567890',
  amount: 1000,
  note: '午餐費',
};

describe('buildBankUrl', () => {
  it('replaces {account} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?acct={account}', baseParams);
    expect(url).toBe('https://bank.com/pay?acct=1234567890');
  });

  it('replaces {paddedAccount} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?acct={paddedAccount}', baseParams);
    expect(url).toBe('https://bank.com/pay?acct=0000001234567890');
  });

  it('replaces {bankCode} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?bank={bankCode}', baseParams);
    expect(url).toBe('https://bank.com/pay?bank=812');
  });

  it('replaces {amount} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?amt={amount}', baseParams);
    expect(url).toBe('https://bank.com/pay?amt=1000');
  });

  it('replaces {amountCents} placeholder', () => {
    const url = buildBankUrl('https://bank.com/pay?cents={amountCents}', baseParams);
    expect(url).toBe('https://bank.com/pay?cents=100000');
  });

  it('replaces {note} with URL-encoded value', () => {
    const url = buildBankUrl('https://bank.com/pay?note={note}', baseParams);
    expect(url).toContain('note=');
    expect(url).not.toContain('午餐費');
  });

  it('replaces multiple placeholders', () => {
    const url = buildBankUrl(
      'https://bank.com/pay?bank={bankCode}&acct={account}&amt={amount}',
      baseParams,
    );
    expect(url).toBe('https://bank.com/pay?bank=812&acct=1234567890&amt=1000');
  });

  it('returns template unchanged when no placeholders', () => {
    const url = buildBankUrl('https://bank.com/pay', baseParams);
    expect(url).toBe('https://bank.com/pay');
  });
});

describe('intent utilities', () => {
  it('parses serialized intent URLs with typed extras and infers package from component', () => {
    const parsed = parseIntentInput(
      'intent://pay/scan#Intent;scheme=bankapp;action=android.intent.action.VIEW;component=com.bank.app/com.bank.PayActivity;S.account=1234567890;B.fast=true;i.amount=1000;end',
    );

    expect(parsed).toMatchObject({
      action: 'android.intent.action.VIEW',
      packageName: 'com.bank.app',
      className: 'com.bank.app/com.bank.PayActivity',
      dataUri: 'bankapp://pay/scan',
    });
    expect(parsed?.extras?.account).toEqual({ type: 'S', value: '1234567890' });
    expect(parsed?.extras?.fast).toEqual({ type: 'B', value: 'true' });
    expect(parsed?.extras?.amount).toEqual({ type: 'i', value: '1000' });
  });

  it('parses Shortcut Maker multi-line format', () => {
    const parsed = parseIntentInput(`
      Action=android.intent.action.VIEW
      Package Name=com.bank.app
      Class Name=com.bank.app/com.bank.PayActivity
      Data=bankapp://pay/scan
      Extras=>
      account:1234567890
      fast:true
    `);

    expect(parsed).toMatchObject({
      action: 'android.intent.action.VIEW',
      packageName: 'com.bank.app',
      dataUri: 'bankapp://pay/scan',
    });
    expect(parsed?.extras?.fast).toEqual({ type: 'B', value: 'true' });
  });

  it('builds Chrome intent URLs and removes launcher-only MAIN actions', () => {
    const url = buildIntentUrl({
      action: 'android.intent.action.MAIN',
      packageName: 'com.bank.app',
      dataUri: 'bankapp://pay/scan',
      extras: { account: { type: 'S', value: '1234567890' } },
    });

    expect(url).toContain('intent://pay/scan#Intent;scheme=bankapp');
    expect(url).toContain(';package=com.bank.app');
    expect(url).toContain(';S.account=1234567890');
    expect(url).toContain(';S.browser_fallback_url=');
    expect(url).not.toContain('action=android.intent.action.MAIN');
  });

  it('normalizes native Android intent URLs and strips incompatible launcher flags', () => {
    const url = normalizeIntentUrl(
      'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.bank.app;end',
    );

    expect(isIntentUrl(url)).toBe(true);
    expect(url).toBe('intent://#Intent;package=com.bank.app;end');
  });
});

describe('parseManifestXml', () => {
  it('extracts browsable ACTION_VIEW deep links with single-quoted attributes', () => {
    const links = parseManifestXml(`
      <manifest package='com.bank.app'>
        <application>
          <activity android:name='.PayActivity'>
            <intent-filter>
              <action android:name='android.intent.action.VIEW' />
              <category android:name='android.intent.category.DEFAULT' />
              <category android:name='android.intent.category.BROWSABLE' />
              <data android:scheme='bankapp' android:host='pay' android:pathPrefix='/scan' />
            </intent-filter>
          </activity>
        </application>
      </manifest>
    `);

    expect(links).toEqual([
      {
        activityName: '.PayActivity',
        url: 'bankapp://pay/scan',
        scheme: 'bankapp',
        host: 'pay',
        path: '/scan',
        packageName: 'com.bank.app',
      },
    ]);
  });

  it('ignores non-browsable manifest links', () => {
    const links = parseManifestXml(`
      <manifest package="com.bank.app">
        <application>
          <activity android:name=".LauncherActivity">
            <intent-filter>
              <action android:name="android.intent.action.VIEW" />
              <data android:scheme="bankapp" />
            </intent-filter>
          </activity>
        </application>
      </manifest>
    `);

    expect(links).toEqual([]);
  });
});
