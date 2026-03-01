/** American English (en-US) */
import type { Translations } from './zh-TW';

const enUS: Translations = {
  /* ─── Common ───────────────────────────────────────────── */
  common: {
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    done: 'Done',
    back: 'Back',
    skipToMain: 'Skip to main content',
    goHome: 'Go to Home',
    understand: 'Got it',
  },

  /* ─── ReceivePage ──────────────────────────────────────── */
  receive: {
    settings: 'Settings',
    myAccount: 'My Account',
    addBankAccount: 'Add Bank Account',
    importAccounts: 'Import Accounts',
    emptyHint: 'Add a bank account to start generating payment QR Codes.',
    generateQR: 'Generate QR Code',
    quickQR: 'Quick QR',
    quickQRDesc: 'Generate a QR Code without creating an account',
    quickQRTitle: 'Quick QR',
    quickQRGenerate: 'Generate QR Code',
    quickQRSave: 'Save This Account',
    quickQRSaved: 'Account saved',
    addNote: 'Add a note',
    notePrefix: 'Note: ',
    noteTitle: 'Transaction Note',
    noteLabel: 'Transaction note',
    notePlaceholder: 'Enter a note, up to 19 chars…',
    clearNote: 'Clear Note',
  },

  /* ─── AmountInput ──────────────────────────────────────── */
  amount: {
    label: 'Amount',
    clearAmount: 'Clear amount',
    keypad: 'Numeric keypad',
    backspace: 'Delete last digit',
    zeroHint: 'Leave blank to let the payer enter the amount',
    maxHint: (max: string) => `Max NT$${max}`,
    payerEnter: 'Amount entered by payer',
  },

  /* ─── QRDisplay ────────────────────────────────────────── */
  qr: {
    title: 'Payment QR Code',
    enlargeQR: 'Enlarge QR Code',
    share: 'Share',
    revealAccount: 'Reveal account',
    hideAccount: 'Hide account',
    copyAccount: 'Copy account',
    notePrefix: 'Note: ',
    safetyReminder: 'Verify the account number and name in your banking app before transferring',
    copiedAccount: 'Account copied',
    copyFailed: 'Copy failed',
    fullscreenLabel: 'Fullscreen QR Code',
    fullscreenClose: 'Exit fullscreen',
    fullscreenHint: 'Tap anywhere to go back',
    shareTitle: 'OpenTWQR Payment',
    shareImageTitle: 'OpenTWQR Payment QR',
    shareText: (amount: string, bankName: string) => {
      let s = 'Payment';
      if (amount) s += ` ${amount}`;
      if (bankName) s += ` — ${bankName}`;
      return s;
    },
  },

  /* ─── Share menu ───────────────────────────────────────── */
  share: {
    menuLabel: 'Share options',
    copyLink: 'Copy Link',
    copyLinkDesc: 'Copy payment page link to clipboard',
    shareLink: 'Share Link',
    shareLinkDesc: 'Send link via another app',
    copyImage: 'Copy Image',
    copyImageDesc: 'Copy QR Code image to clipboard',
    shareImage: 'Share Image',
    shareImageDesc: 'Send QR Code image to recipient',
    downloadImage: 'Download Image',
    downloadImageDesc: 'Save QR Code to device',
    copiedLink: 'Link copied',
    copiedImage: 'Image copied',
    downloadedImage: 'Image downloaded',
    shareFailed: 'Share failed',
    downloadFailed: 'Download failed',
  },

  /* ─── LinkSettingsDialog ───────────────────────────────── */
  linkSettings: {
    title: 'Link Settings',
    expiryLabel: 'Link Expiry',
    expiryOptions: {
      0: 'No limit',
      600: '10 min',
      3600: '1 hour',
      86400: '1 day',
    } as Record<number, string>,
    passwordLabel: 'Link Password',
    passwordOptional: '(optional)',
    passwordPlaceholder: 'Leave blank for no password',
    encrypting: 'Encrypting…',
    copyLinkAction: 'Copy Link',
    shareLinkAction: 'Share Link',
    encryptFailed: 'Encryption failed',
  },

  /* ─── AccountsPage ─────────────────────────────────────── */
  accounts: {
    title: 'Accounts',
    importLabel: 'Import accounts',
    addLabel: 'Add account',
    emptyTitle: 'No Accounts',
    emptyHint: 'Add a bank account to start receiving payments via TWQR.',
    selectAccount: (name: string) => `Select ${name}`,
    editAccount: 'Edit account',
    deleteAccount: 'Delete account',
    deleteTitle: 'Delete Account',
    deleteDesc: 'This account will be permanently removed from this device.',
    editTitle: 'Edit Account',
    addTitle: 'Add Account',
  },

  /* ─── AccountForm ──────────────────────────────────────── */
  form: {
    bankLabel: 'Bank',
    bankHint: 'The financial institution of the receiving account',
    bankPlaceholder: 'Select a bank…',
    accountLabel: 'Account Number',
    accountPlaceholder: 'Enter bank account number…',
    accountHint: '10–16 digits, without branch code',
    nicknameLabel: 'Nickname (optional)',
    nicknamePlaceholder: 'e.g., Savings, Salary…',
    nicknameHint: 'Helps identify different accounts',
    iconLabel: 'Custom Icon (optional)',
    iconHint: 'Enter an image URL or the bank website URL',
    saveAccount: 'Save Account',
    selectBank: 'Please select a bank',
    invalidAccount: 'Account must be 10–16 digits',
    duplicateExact: 'This account already exists',
    duplicateWarn: 'You already have an account with the same bank and number. Add anyway?',
    addAnyway: 'Add Anyway',
  },

  /* ─── BankSelect ───────────────────────────────────────── */
  bankSelect: {
    title: 'Select Bank',
    searchPlaceholder: 'Search bank name or code…',
    searchLabel: 'Search bank name or code',
    found: (count: number) => `${count} bank${count !== 1 ? 's' : ''} found`,
    noResult: (q: string) => `No results for "${q}"`,
  },

  /* ─── SettingsPage ─────────────────────────────────────── */
  settings: {
    title: 'Settings',
  },

  /* ─── QRSettingsSection ────────────────────────────────── */
  qrSettings: {
    sectionTitle: 'QR Code Display',
    logoTitle: 'Center Logo',
    logoDesc: 'Choose the logo shown in the QR Code center',
    logoOpenTWQR: 'Open TWQR',
    logoBankIcon: 'Bank Icon',
    customNameTitle: 'Custom Name',
    customNameDesc: 'Label whose payment code this is',
    customNamePlaceholder: 'e.g., John…',
    bankNameTitle: 'Show Bank Name',
    bankNameDesc: 'Display official bank name below the QR Code',
  },

  /* ─── PersonalizationSection (Accent + AppLock combined) ─ */
  personalization: {
    sectionTitle: 'Personalization',
    /* Accent color */
    accentTitle: 'Accent Color',
    accentDesc: 'Choose your preferred accent color',
    accentPresetsLabel: 'Preset colors',
    accentSliderLabel: 'Adjust hue',
    accentHueLabel: 'Hue angle',
    resetColor: 'Reset to default color',
    resetColorShort: 'Reset',
    /* App lock */
    appLockTitle: 'App Lock',
    appLockDesc: 'Use device authentication to protect data',
    lockTimeoutTitle: 'Lock Timeout',
    lockTimeoutDesc: 'Re-authentication required after being in the background for this long',
    lockTimeoutLabel: 'Lock timeout',
    lockTimeoutOptions: {
      0: 'Immediately',
      10_000: '10 sec',
      60_000: '1 min',
      300_000: '5 min',
      3_600_000: '1 hour',
    } as Record<number, string>,
  },

  /* ─── AccentColor presets ──────────────────────────────── */
  accentPresets: {
    200: 'Aqua Blue',
    250: 'Indigo',
    285: 'Lavender',
    340: 'Rose',
    15: 'Coral',
    55: 'Amber',
    145: 'Jade',
    175: 'Teal',
  } as Record<number, string>,

  /* ─── BackupSection ────────────────────────────────────── */
  backup: {
    sectionTitle: 'Backup',
    exportTitle: 'Export Accounts',
    exportDesc: 'Generate an encrypted string for safe storage',
    importTitle: 'Import Accounts',
    importDesc: 'Paste an encrypted string to restore accounts',
  },

  /* ─── ExportDialog ─────────────────────────────────────── */
  exportDialog: {
    title: 'Export Accounts',
    subtitle: 'All accounts will be encrypted into a string',
    passwordLabel: 'Set Password',
    passwordOptional: '(optional)',
    passwordPlaceholder: 'Leave blank for no password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter password',
    infoWithPassword: 'Your account data will be encrypted with AES-256. Password required for import.',
    infoWithoutPassword: 'Without a password, anyone with this string can import the accounts.',
    noAccounts: 'No accounts to export',
    passwordMismatch: 'Passwords do not match',
    encrypting: 'Encrypting…',
    export: 'Export',
    copyEncrypted: 'Copy Encrypted String',
    copied: 'Copied',
    shareViaApp: 'Share via App',
    shared: 'Shared',
    copyFailed: 'Copy failed',
    shareFailed: 'Share failed',
  },

  /* ─── ImportDialog ─────────────────────────────────────── */
  importDialog: {
    title: 'Import Accounts',
    subtitle: 'Paste the previously exported encrypted string',
    inputPlaceholder: 'OTWQR1-...',
    inputLabel: 'Import encrypted string',
    passwordLabel: 'Enter Password',
    passwordPlaceholder: 'Enter the password set during export',
    emptyInput: 'Please paste a backup string',
    invalidString: 'Invalid backup string',
    wrongPassword: 'Wrong password',
    decryptError: 'Decryption failed, the string may be corrupted',
    decrypting: 'Decrypting…',
    decrypt: 'Decrypt',
    summary: (total: number, newCount: number) =>
      `${total} account${total !== 1 ? 's' : ''}, ${newCount} new`,
    selectAll: 'Select All',
    selectNewOnly: 'New Only',
    existing: 'Exists',
    nicknamePlaceholder: 'Nickname (optional)',
    addNickname: 'Add nickname',
    selectLabel: (checked: boolean, name: string) =>
      `${checked ? 'Deselect' : 'Select'} ${name}`,
    importCount: (n: number) => `Import ${n} Account${n !== 1 ? 's' : ''}`,
    successTitle: 'Import Complete',
    successDesc: (n: number) => `Successfully imported ${n} account${n !== 1 ? 's' : ''}`,
  },

  /* ─── SafetySection ────────────────────────────────────── */
  safety: {
    sectionTitle: 'Privacy & Security',
    infoTitle: 'Privacy & Security Info',
    infoDesc: 'Learn about data protection and transfer safety',
    modalTitle: 'Privacy & Security',
    privacyTitle: 'Privacy Notice',
    privacyDesc: 'QR Codes are generated locally in your browser. Account data is stored only on this device and is never uploaded to any server.',
    securityTitle: 'Security Reminder',
    securityDesc: 'Always verify the recipient account number and name in your banking app before making a transfer.',
    scamTitle: 'Fraud Prevention',
    scamDesc: 'Never transfer funds to accounts provided by unknown sources. If someone asks you to receive money and forward it, it is likely a scam.',
  },

  /* ─── AboutSection ─────────────────────────────────────── */
  about: {
    sectionTitle: 'About',
    sponsorTitle: 'Sponsor the Developer',
    sponsorDesc: 'Buy some tokens for the AI to support the project',
    githubTitle: 'GitHub Source Code',
    githubDesc: 'View source, report issues, or contribute',
  },

  /* ─── AuthLockScreen ───────────────────────────────────── */
  auth: {
    promptDesc: 'Verify your identity to unlock the app',
    unlock: 'Unlock',
    authenticating: 'Verifying…',
    authFailed: 'Verification failed, please try again',
  },

  /* ─── SharedPage ───────────────────────────────────────── */
  shared: {
    needPasswordTitle: 'Password Required',
    needPasswordDesc: 'This payment link is password-protected. Enter the password to view.',
    passwordPlaceholder: 'Enter password…',
    passwordLabel: 'Link password',
    wrongPassword: 'Wrong password, please try again',
    decrypting: 'Decrypting…',
    unlock: 'Unlock',
    expiredTitle: 'Link Expired',
    expiredDesc: 'This payment link has expired and can no longer be used.',
    invalidTitle: 'Invalid Link',
    invalidDesc: 'This payment link could not be parsed. It may be corrupted or malformed.',
  },

  /* ─── ThemeToggle ──────────────────────────────────────── */
  theme: {
    system: 'System',
    light: 'Light Mode',
    dark: 'Dark Mode',
  },

  /* ─── LanguageToggle ───────────────────────────────────── */
  language: {
    toggleLabel: 'Switch language',
    zh: '中文',
    en: 'English',
  },

  /* ─── InstallPrompt ────────────────────────────────────── */
  install: {
    dismiss: 'Dismiss install prompt',
    ariaLabel: 'Install application',
    title: 'Install OpenTWQR',
    chromiumDesc: 'Install to your home screen for offline access and faster payments.',
    chromiumButton: 'Install App',
    iosInstructionBefore: 'Tap the ',
    iosShareLabel: 'Share',
    iosInstructionAfter: ' button at the bottom, then select "',
    iosActionLabel: 'Add to Home Screen',
    iosInstructionEnd: '" to install.',
  },

  /* ─── ReloadPrompt ─────────────────────────────────────── */
  reload: {
    newVersion: 'New version available',
    update: 'Update',
    later: 'Later',
    dismiss: 'Dismiss',
  },
} as const;

export default enUS;
