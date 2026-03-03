/** American English (en-US) */
import type { Translations } from './zh-TW';

const enUS: Translations = {
  /* ─── Common ───────────────────────────────────────────── */
  common: {
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    done: 'Done',
    back: 'Back',
    skipToMain: 'Skip to main content',
    goHome: 'Go to Home',
    understand: 'Got it',
    loading: 'Loading',
    or: 'or',
    expand: 'Expand',
    collapse: 'Collapse',
  },

  /* ─── ReceivePage ──────────────────────────────────────── */
  receive: {
    settings: 'Settings',
    myAccount: 'My Account',
    addAccount: 'Add Account',
    importAccounts: 'Import Accounts',
    emptyHint: 'Add an account to start generating QR Codes.',
    loadSample: 'Load Sample Accounts',
    loadSampleDesc: 'Try it out first — delete them later in Accounts',
    loadSampleHint: 'For demo only — not real accounts. Delete anytime.',
    sampleLabel: 'Sample',
    generateQR: 'Generate QR',
    quickAccess: 'Quick Access',
    quickAccessDesc: 'Generate QR without saving',
    quickAccessTitle: 'Quick Access',
    quickAccessGenerate: 'Generate QR',
    quickAccessSave: 'Save Account',
    quickAccessSaved: 'Saved',
    addNote: 'Add Note',
    noteTitle: 'Note',
    noteLabel: 'Note',
    notePlaceholder: 'Up to 19 chars…',
    clearNote: 'Clear',
    bankCode: (code: string) => `（${code}）`,
  },

  /* ─── AmountInput ──────────────────────────────────────── */
  amount: {
    label: 'Amount',
    clearAmount: 'Clear amount',
    keypad: 'Numeric keypad',
    backspace: 'Delete last digit',
    zeroHint: 'Leave blank for payer to enter',
    maxHint: (max: string) => `Max NT$${max}`,
    payerEnter: 'Payer enters amount',
  },

  /* ─── QRDisplay ────────────────────────────────────────── */
  qr: {
    title: 'Payment QR',
    enlargeQR: 'Enlarge QR',
    share: 'Share',
    revealAccount: 'Reveal account',
    hideAccount: 'Hide account',
    copyAccount: 'Copy account',
    notePrefix: 'Note: ',
    safetyReminder: 'Verify account & name in banking app before transfer',
    copiedAccount: 'Account copied',
    copyFailed: 'Copy failed',
    fullscreenLabel: 'Fullscreen QR Code',
    fullscreenClose: 'Exit fullscreen',
    fullscreenHint: 'Tap anywhere to go back',
    shareTitle: 'OpenTWQR Payment',
    shareImageTitle: 'OpenTWQR Payment QR Code',
    shareText: (amount: string, bankName: string) => {
      let s = 'Payment';
      if (amount) s += ` ${amount}`;
      if (bankName) s += ` — ${bankName}`;
      return s;
    },
    editCustomName: 'Edit display message',
    customNamePlaceholder: 'Enter a message (optional)',
    addCustomName: 'Add display message',
  },

  /* ─── Share menu ───────────────────────────────────────── */
  share: {
    menuLabel: 'Share options',
    copyLink: 'Copy Link',
    copyLinkDesc: 'Copy link to clipboard',
    shareLink: 'Share Link',
    shareLinkDesc: 'Send link via app',
    copyImage: 'Copy Image',
    copyImageDesc: 'Copy QR image to clipboard',
    shareImage: 'Share Image',
    shareImageDesc: 'Send QR image to recipient',
    downloadImage: 'Download',
    downloadImageDesc: 'Save QR to device',
    copiedLink: 'Link copied',
    copiedImage: 'Image copied',
    downloadedImage: 'Image downloaded',
    shareFailed: 'Share failed',
    downloadFailed: 'Download failed',
  },

  /* ─── LinkSettingsDialog ───────────────────────────────── */
  linkSettings: {
    title: 'Link Settings',
    expiryLabel: 'Expiry',
    expiryOptions: {
      0: 'No limit',
      600: '10 min',
      3600: '1 hour',
      86400: '1 day',
    } as Record<number, string>,
    passwordLabel: 'Link Password',
    passwordOptional: '(optional)',
    passwordPlaceholder: 'Leave blank for no password',
    creating: 'Creating link…',
    copyLinkAction: 'Copy Link',
    shareLinkAction: 'Share Link',
    createFailed: 'Failed to create link',
  },

  /* ─── AccountsPage ─────────────────────────────────────── */
  accounts: {
    title: 'Accounts',
    importLabel: 'Import accounts',
    addLabel: 'Add account',
    emptyTitle: 'No Accounts',
    emptyHint: 'Add a bank account to start receiving payments via OpenTWQR.',
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
    bankHint: 'Financial institution of the account',
    bankPlaceholder: 'Select a bank…',
    accountLabel: 'Account Number',
    accountPlaceholder: 'Enter bank account number…',
    accountHint: '10–16 digits, no branch code',
    nicknameLabel: 'Nickname (optional)',
    nicknamePlaceholder: 'e.g., Savings…',
    nicknameHint: 'Helps identify accounts',
    iconLabel: 'Custom Icon (optional)',
    iconHint: 'Image or bank website URL',
    saveAccount: 'Save Account',
    selectBank: 'Please select a bank',
    invalidAccount: 'Please enter an account number',
    shortAccountWarn: (n: number) => `This account has only ${n} digits — below the standard 10-digit minimum. If this is an e-payment account (e.g. JKOPay), confirm save anyway?`,
    duplicateExact: 'This account already exists',
    duplicateWarn: 'You already have an account with the same bank and number. Add anyway?',
    addAnyway: 'Add Anyway',
    saveShort: 'Save Anyway',
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
    settingsTitle: 'Customize QR Code',
    settingsDesc: 'Choose what to display on your QR Code',
    settingsModalTitle: 'Customize QR Code',
    logoTitle: 'Show Bank Icon',
    logoDesc: 'Embed bank icon in the center of QR Code',
    showAccountTitle: 'Show Account Number',
    showAccountDesc: 'Display account number above QR Code',
    bankNameTitle: 'Show Bank Name',
    bankNameDesc: 'Show bank name below QR Code',
    customNameTitle: 'Display Name',
    customNameDesc: 'Show recipient name at bottom of QR Code',
    customNamePlaceholder: 'e.g., John…',
    customNameModalTitle: 'Display Name',
    customNameClear: 'Clear',
    /* QR style settings */
    styleTitle: 'QR Code Appearance',
    dotStyleTitle: 'Dot Shape',
    dotStyleSquare: 'Square',
    dotStyleRounded: 'Rounded',
    dotStyleDots: 'Dots',
    eyeStyleTitle: 'Finder Pattern',
    eyeStyleSquare: 'Square',
    eyeStyleRounded: 'Rounded',
    errorLevelTitle: 'Error Correction',
    errorLevelDesc: 'When center logo is shown, minimum is Q',
    errorLevelAutoUpgrade: 'Auto-upgraded to Q (required for logo)',
  },

  /* ─── PersonalizationSection (Accent + AppLock combined) ─ */
  personalization: {
    sectionTitle: 'Personalization',
    /* Accent color */
    accentTitle: 'Accent Color',
    accentDesc: 'Choose preferred theme color',
    accentPresetsLabel: 'Presets',
    accentSliderLabel: 'Adjust hue',
    accentHueLabel: 'Hue angle',
    resetColor: 'Reset to default color',
    resetColorShort: 'Reset',
    /* App lock */
    appLockTitle: 'App Lock',
    appLockDesc: 'Use device auth to protect data',
    lockTimeoutTitle: 'Lock Timeout',
    lockTimeoutLabel: 'Lock timeout',
    lockTimeoutOptions: {
      0: 'Instant',
      10_000: '10s',
      60_000: '1m',
      300_000: '5m',
      3_600_000: '1h',
    } as Record<number, string>,
  },

  /* ─── AccentColor presets ──────────────────────────────── */
  accentPresets: {
    25: 'Coral',
    70: 'Amber',
    145: 'Jade',
    180: 'Teal',
    216: 'Blue',
    270: 'Violet',
    330: 'Rose',
  } as Record<number, string>,

  /* ─── BackupSection ────────────────────────────────────── */
  backup: {
    sectionTitle: 'Backup',
    exportTitle: 'Export Backup',
    exportDesc: 'Choose what to include and generate a backup string',
    importTitle: 'Import Backup',
    importDesc: 'Paste a backup string to restore accounts or settings',
    storageWarning: 'Your data is stored only in this device\'s browser. Clearing browser data or uninstalling may cause data loss. Back up regularly.',
    storageWarningIOS: 'On iOS/iPadOS, if the app isn\'t added to the Home Screen, Safari may auto-clear data after 7 days of inactivity.',
    reminderTitle: 'Backup Reminder',
    reminderDesc: 'It\'s been over 30 days since your last backup. Back up now to prevent data loss.',
    reminderAction: 'Go to Backup',
    reminderDismiss: 'Later',
  },

  /* ─── ExportDialog ─────────────────────────────────────── */
  exportDialog: {
    title: 'Export Backup',
    subtitle: 'Choose what to include and generate a backup string',
    categoriesLabel: 'Include',
    catAccounts: 'Bank Accounts',
    catAccountsDesc: (n: number) => `${n} account${n !== 1 ? 's' : ''}`,
    catStyle: 'Style',
    catStyleAccent: 'Accent Colour',
    catStyleQR: 'QR Code Style',
    catPreferences: 'Preferences',
    catPrefsMode: 'Appearance Mode',
    catPrefsLocale: 'Language',
    catPaymentLinks: (n: number) => `Payment App Links (${n})`,
    passwordLabel: 'Set Password',
    passwordOptional: '(optional)',
    passwordPlaceholder: 'Leave blank for no password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter password',
    infoWithPassword: 'Data encrypted with AES-256. Password needed for import.',
    infoWithoutPassword: 'Without a password, anyone with this string can import.',
    noAccounts: 'No accounts to export',
    passwordMismatch: 'Passwords do not match',
    exporting: 'Exporting…',
    export: 'Export',
    copyBackup: 'Copy Backup String',
    copied: 'Copied',
    shareViaApp: 'Share via App',
    shared: 'Shared',
    copyFailed: 'Copy failed',
    shareFailed: 'Share failed',
    exportFailed: 'Export failed',
  },

  /* ─── ImportDialog ─────────────────────────────────────── */
  importDialog: {
    title: 'Import Backup',
    subtitle: 'Paste your backup string to preview and select what to restore',
    inputPlaceholder: 'OTWQR1-...',
    inputLabel: 'Backup string',
    passwordLabel: 'Enter Password',
    passwordPlaceholder: 'Enter export password',
    emptyInput: 'Paste a backup string',
    invalidString: 'Invalid backup string',
    wrongPassword: 'Wrong password',
    importError: 'Import failed, string may be corrupted',
    importing: 'Importing…',
    import: 'Import',
    summary: (total: number, newCount: number) =>
      `${total} account${total !== 1 ? 's' : ''}, ${newCount} new`,
    selectAll: 'Select All',
    selectNewOnly: 'New Only',
    existing: 'Exists',
    nicknamePlaceholder: 'Nickname (optional)',
    addNickname: 'Add nickname',
    selectLabel: (checked: boolean, name: string) =>
      `${checked ? 'Deselect' : 'Select'} ${name}`,
    confirmImport: 'Confirm Import',
    catAccounts: 'Bank Accounts',
    catStyle: 'Style',
    catStyleAccent: 'Accent Colour',
    catStyleQR: 'QR Code Style',
    catPreferences: 'Preferences',
    catPrefsMode: 'Appearance Mode',
    catPrefsLocale: 'Language',
    catPaymentLinks: (n: number) => `Payment App Links (${n})`,
    paymentLinkConflict: 'Already configured',
    paymentLinkOverwrite: 'Overwrite',
    paymentLinkKeep: 'Keep',
    paymentLinksNewDesc: (n: number) => `+${n} new link${n !== 1 ? 's' : ''} will be added`,
    successTitle: 'Import Complete',
    successDesc: (n: number) => n === 0 ? 'Selected accounts are already up to date' : `Successfully processed ${n} account${n !== 1 ? 's' : ''}`,
    settingsApplied: 'Style & preferences applied',
  },

  /* ─── SafetySection ────────────────────────────────────── */
  safety: {
    sectionTitle: 'Privacy & Security',
    infoTitle: 'Privacy & Security Info',
    infoDesc: 'Data protection & transfer safety',
    modalTitle: 'Privacy & Security',
    privacyTitle: 'Privacy Notice',
    privacyDesc: 'QR Codes are generated locally. Account data stays on this device only — never uploaded.',
    securityTitle: 'Security',
    securityDesc: 'Verify recipient account & name in your banking app before transferring.',
    scamTitle: 'Fraud Prevention',
    scamDesc: 'Never transfer to unknown accounts. If asked to receive & forward money, it\'s likely fraud.',
  },

  /* ─── AboutSection ─────────────────────────────────────── */
  about: {
    sectionTitle: 'About',
    sponsorTitle: 'Sponsor the Developer',
    sponsorDesc: 'Feed some tokens to the AI',
    githubTitle: 'GitHub Source',
    githubDesc: 'View source, report issues, contribute',
    versionTitle: 'Version Info',
    versionDesc: (hash: string) => `Build: ${hash}`,
    checkUpdateTitle: 'Check for Updates',
    checkUpdateDesc: 'Manually check for a new version',
    checkingUpdate: 'Checking…',
    upToDate: 'Already up to date',
    updateAvailable: 'New version found, updating',
    checkFailed: 'Check failed, try again later',
  },

  /* ─── Bottom Navigation ────────────────────────────────── */
  nav: {
    receive: 'Receive',
    scan: 'Scan',
    accounts: 'Accounts',
    settings: 'Settings',
    ariaLabel: 'Main navigation',
  },

  /* ─── ScanPage ─────────────────────────────────────────── */
  scan: {
    title: 'Scan QR Code',
    hint: 'Align QR Code within the frame',
    unsupportedTitle: 'Scan Not Supported',
    unsupportedDesc: 'Your browser does not support camera scanning. Please upload an image or use a different browser.',
    permissionTitle: 'Camera Permission Needed',
    permissionDesc: 'Please allow camera access to scan QR Codes.',
    noCameraTitle: 'No Camera Found',
    noCameraDesc: 'No camera was detected on your device. You can upload an image instead.',
    unknownErrorTitle: 'Camera Error',
    unknownErrorDesc: 'An unexpected error occurred while starting the camera. You can retry or upload an image instead.',
    uploadImage: 'Upload Image',
    torchOn: 'Turn on flashlight',
    torchOff: 'Turn off flashlight',
    noQRFound: 'No QR Code found in the image',
    decodeFailed: 'Failed to decode image',
    unknownBank: 'Unknown Bank',
    amount: 'Amount',
    note: 'Note',
    openBankApp: 'Open Payment App',
    openLink: 'Open Link',
    showResult: 'Show Payment Info',
    showQR: 'Show QR Code',
    copyAccount: 'Copy Account',
    copiedAccount: 'Account copied',
    copyRaw: 'Copy',
    copied: 'Copied',
    rescan: 'Scan Again',
    rawResult: 'Scan Result',
    retry: 'Retry',
  },

  /* ─── URL Scheme Settings ──────────────────────────────── */
  urlScheme: {
    sectionTitle: 'Payment App Integration',
    sectionDesc: 'Quickly open payment app after scanning',
    manageTitle: 'Payment App Integration',
    entryRow: 'Manage Payment Links',
    entryDesc: 'Open a payment app after scanning a QR Code',
    configCount: (n: number) => `${n} bank${n === 1 ? '' : 's'}`,
    emptyTitle: 'No Configurations',
    emptyHint: 'Set up bank integrations to open your payment app with a single tap after scanning.',
    addBank: 'Add Payment Link',
    addLabel: 'Add',
    editTitle: 'Edit Payment Link',
    addTitle: 'Add Payment Link',
    urlLabel: 'URL Template',
    urlPlaceholder: 'https://bank.example.com/pay?acct={account}',
    placeholderHelp: 'Placeholder info',
    placeholderTitle: 'Available placeholders:',
    phAccount: 'Account number',
    phPaddedAccount: '16-digit zero-padded account',
    phBankCode: 'Bank code',
    phAmount: 'Amount in TWD',
    phAmountCents: 'Amount in cents (TWD × 100)',
    phNote: 'Note (URL-encoded)',
    deleteTitle: 'Remove Payment Link',
    deleteConfirm: 'Are you sure you want to remove this payment link configuration? This cannot be undone.',
    save: 'Save',
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
    unlocking: 'Unlocking…',
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
    chromiumDesc: 'Install for offline access & faster payments.',
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
  /* ─── ErrorBoundary ────────────────────────────────────── */
  errorBoundary: {
    title: 'Something went wrong',
    desc: 'An unexpected error has occurred. Please refresh and try again.',
    refresh: 'Refresh',
  },
  /* ─── ShareTarget ─────────────────────────────────────── */
  shareTarget: {
    prompt: 'What would you like to do with this account?',
    addAccount: 'Save as My Account',
    addAccountDesc: 'Add to your accounts list for quick QR generation',
    pay: 'Go to Payment',
    payDesc: 'View payment details and open payment app or QR Code',
  },
  /* ─── DangerSection ─────────────────────────────────── */
  danger: {
    sectionTitle: 'Danger Zone',
    resetTitle: 'Reset All Data',
    resetDesc: 'Clear all accounts, settings, and preferences',
    resetConfirmTitle: 'Reset all data?',
    resetConfirmDesc: 'This will permanently delete all accounts, backups, preferences, and app data. This cannot be undone.',
    resetConfirm: 'Reset All Data',
    resetCancel: 'Cancel',
  },

  /* ─── Onboarding ──────────────────────────────────── */
  onboarding: {
    skip: 'Skip',
    next: 'Next',
    getStarted: 'Get Started',
    step1Title: 'Welcome to OpenTWQR',
    step1Desc: 'Generate TWQR payment QR Codes for free. Recipients scan with their banking app to transfer money.',
    step2Title: 'Add Your Bank Account',
    step2Desc: 'Start by adding a receiving account, then quickly generate payment QR Codes anytime.',
    step3Title: 'Share & Backup',
    step3Desc: 'Share payment links or images, and encrypt-backup your account data for safekeeping.',
  },
} as const;

export default enUS;
