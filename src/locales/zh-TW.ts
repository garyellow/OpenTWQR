/** Traditional Chinese (zh-TW) — default locale */
const zhTW = {
  /* ─── Common ───────────────────────────────────────────── */
  common: {
    close: '關閉',
    cancel: '取消',
    confirm: '確認',
    delete: '刪除',
    done: '完成',
    back: '返回',
    skipToMain: '跳至主要內容',
    goHome: '前往首頁',
    understand: '了解',
    loading: '載入中',
    or: '或',
    expand: '展開',
    collapse: '收合',
  },

  /* ─── ReceivePage ──────────────────────────────────────── */
  receive: {
    settings: '設定',
    myAccount: '我的帳戶',
    addAccount: '新增帳戶',
    importAccounts: '匯入帳戶',
    emptyHint: '新增帳戶後即可開始產生收款 QR Code。',
    loadSample: '載入範例帳戶',
    loadSampleDesc: '先體驗看看，之後可在帳戶管理中刪除',
    loadSampleHint: '資料為展示用途，非真實帳號，可隨時刪除',
    sampleLabel: '範例',
    generateQR: '產生 QR Code',
    quickAccess: '快速使用',
    quickAccessDesc: '不建立帳戶，直接輸入帳號產生 QR Code',
    quickAccessTitle: '快速使用',
    quickAccessGenerate: '產生 QR Code',
    quickAccessSave: '儲存此帳戶',
    quickAccessSaved: '已儲存帳戶',
    addNote: '新增交易備註',
    noteTitle: '交易備註',
    noteLabel: '交易備註',
    notePlaceholder: '輸入備註，最多 19 字…',
    clearNote: '清除備註',
  },

  /* ─── AmountInput ──────────────────────────────────────── */
  amount: {
    label: '轉帳金額',
    clearAmount: '清除金額',
    keypad: '數字鍵盤',
    backspace: '刪除一位數字',
    zeroHint: '不輸入金額，由付款方自行填入',
    maxHint: (max: string) => `上限 NT$${max}`,
    payerEnter: '金額由付款方輸入',
  },

  /* ─── QRDisplay ────────────────────────────────────────── */
  qr: {
    title: '收款 QR Code',
    enlargeQR: '放大 QR Code',
    share: '分享',
    revealAccount: '顯示帳號',
    hideAccount: '隱藏帳號',
    copyAccount: '複製帳號',
    notePrefix: '備註：',
    safetyReminder: '請於銀行 App 核對帳號及戶名後再轉帳',
    copiedAccount: '已複製帳號',
    copyFailed: '複製失敗',
    fullscreenLabel: '全螢幕 QR Code',
    fullscreenClose: '關閉全螢幕',
    fullscreenHint: '點擊任意處返回',
    shareTitle: 'OpenTWQR 收款',
    shareImageTitle: 'OpenTWQR 收款碼',
    shareText: (amount: string, bankName: string) => {
      let s = '收款';
      if (amount) s += ` ${amount}`;
      if (bankName) s += ` — ${bankName}`;
      return s;
    },
    editCustomName: '編輯個人訊息',
    customNamePlaceholder: '輸入個人訊息（選填）',
    addCustomName: '新增個人訊息',
  },

  /* ─── Share menu ───────────────────────────────────────── */
  share: {
    menuLabel: '分享方式',
    copyLink: '複製連結',
    copyLinkDesc: '複製收款頁面連結到剪貼簿',
    shareLink: '分享連結',
    shareLinkDesc: '透過其他 App 傳送連結',
    copyImage: '複製圖片',
    copyImageDesc: '複製 QR Code 圖片到剪貼簿',
    shareImage: '分享圖片',
    shareImageDesc: '將 QR Code 圖片傳送給對方',
    downloadImage: '下載圖片',
    downloadImageDesc: '儲存 QR Code 至裝置',
    copiedLink: '已複製連結',
    copiedImage: '已複製圖片',
    downloadedImage: '已下載圖片',
    shareFailed: '分享失敗',
    downloadFailed: '下載失敗',
  },

  /* ─── LinkSettingsDialog ───────────────────────────────── */
  linkSettings: {
    title: '分享連結設定',
    expiryLabel: '連結到期時間',
    expiryOptions: {
      0: '不限制',
      600: '10 分鐘',
      3600: '1 小時',
      86400: '1 天',
    } as Record<number, string>,
    passwordLabel: '連結密碼',
    passwordOptional: '（選填）',
    passwordPlaceholder: '不設定密碼則留空',
    creating: '建立連結中…',
    copyLinkAction: '複製連結',
    shareLinkAction: '分享連結',
    createFailed: '建立連結失敗',
  },

  /* ─── AccountsPage ─────────────────────────────────────── */
  accounts: {
    title: '帳戶管理',
    importLabel: '匯入帳戶',
    addLabel: '新增帳戶',
    emptyTitle: '尚無帳戶',
    emptyHint: '新增收款帳戶即可開始透過 OpenTWQR 收款。',
    selectAccount: (name: string) => `選擇 ${name} 帳戶`,
    editAccount: '編輯帳戶',
    deleteAccount: '刪除帳戶',
    deleteTitle: '刪除帳戶',
    deleteDesc: '此帳戶將永久從此裝置上移除。',
    editTitle: '編輯帳戶',
    addTitle: '新增帳戶',
  },

  /* ─── AccountForm ──────────────────────────────────────── */
  form: {
    bankLabel: '金融機構',
    bankHint: '收款帳戶所屬的金融機構',
    bankPlaceholder: '請選擇金融機構…',
    accountLabel: '帳號',
    accountPlaceholder: '輸入帳號…',
    accountHint: '10–16 位數字，不含分行代碼',
    nicknameLabel: '帳戶暱稱（選填）',
    nicknamePlaceholder: '例如：郵局、薪轉戶…',
    nicknameHint: '方便區分不同帳戶用途',
    iconLabel: '自訂圖示（選填）',
    iconHint: '可以填入圖片網址，也可以填入官網網址',
    saveAccount: '儲存帳戶',
    selectBank: '請選擇金融機構',
    invalidAccount: '請輸入帳號',
    shortAccountWarn: (n: number) => `此帳號僅 ${n} 碼，低於一般金融機構帳號的標準下限（10 碼）。若為電子支付帳號（如街口支付）確定要儲存嗎？`,
    duplicateExact: '此帳戶已存在',
    duplicateWarn: '此機構帳號已有相同紀錄，確定要再新增嗎？',
    addAnyway: '仍要新增',
    saveShort: '確認儲存',
  },

  /* ─── BankSelect ───────────────────────────────────────── */
  bankSelect: {
    title: '選擇金融機構',
    searchPlaceholder: '搜尋機構名稱或代碼…',
    searchLabel: '搜尋機構名稱或代碼',
    found: (count: number) => `找到 ${count} 間機構`,
    noResult: (q: string) => `找不到「${q}」的搜尋結果`,
  },

  /* ─── SettingsPage ─────────────────────────────────────── */
  settings: {
    title: '設定',
  },

  /* ─── QRSettingsSection ────────────────────────────────── */
  qrSettings: {
    settingsTitle: 'QR Code 顯示設定',
    settingsDesc: '自訂顯示內容與外觀樣式',
    settingsModalTitle: 'QR Code 顯示設定',
    logoTitle: '顯示機構 Logo',
    logoDesc: 'QR Code 中央嵌入機構 Logo',
    showAccountTitle: '顯示帳號',
    showAccountDesc: '在 QR Code 下方顯示帳號',
    institutionNameTitle: '顯示機構名稱',
    institutionNameDesc: 'QR Code 下方標示金融機構名稱',
    customNameTitle: '個人訊息',
    customNameDesc: 'QR Code 上方顯示個人訊息',
    customNamePlaceholder: '例如：小明…',
    customNameModalTitle: '個人訊息',
    customNameClear: '清除',
    /* QR style settings */
    styleTitle: 'QR Code 外觀',
    dotStyleTitle: '點陣形狀',
    dotStyleSquare: '方形',
    dotStyleRounded: '圓角',
    dotStyleDots: '圓點',
    eyeStyleTitle: '定位框形狀',
    eyeStyleSquare: '方形',
    eyeStyleRounded: '圓角',
    styleSummary: (dot: string, eye: string) => `點陣：${dot}・定位框：${eye}`,
  },

  /* ─── PersonalizationSection (Accent + AppLock combined) ─ */
  personalization: {
    sectionTitle: '個人化設定',
    /* Accent color */
    accentTitle: '自訂主題色',
    accentDesc: '選擇偏好的介面主題色彩',
    accentPresetsLabel: '預設主題色彩',
    accentSliderLabel: '自由調整色相',
    accentHueLabel: '色相角度',
    resetColor: '還原預設色彩',
    resetColorShort: '還原預設',
    /* App lock */
    appLockTitle: 'App 鎖定',
    appLockDesc: '使用裝置驗證保護帳戶資料',
    appLockUnavailableDesc: '此裝置不支援生物辨識或螢幕鎖定',
    appLockUnsupported: '此瀏覽器不支援 App 鎖定功能',
    lockTimeoutTitle: '背景鎖定時間',
    lockTimeoutLabel: '背景鎖定時間',
    lockTimeoutOptions: {
      0: '立即',
      10_000: '10 秒',
      60_000: '1 分鐘',
      300_000: '5 分鐘',
      3_600_000: '1 小時',
    } as Record<number, string>,
  },

  /* ─── AccentColor presets ──────────────────────────────── */
  accentPresets: {
    25: '珊瑚紅',
    70: '琥珀橘',
    145: '翡翠綠',
    180: '青碧',
    216: '品牌藍',
    270: '薰衣紫',
    330: '玫瑰粉',
  } as Record<number, string>,

  /* ─── BackupSection ────────────────────────────────────── */
  backup: {
    sectionTitle: '資料備份',
    exportTitle: '匯出備份',
    exportDesc: '選擇要備份的項目，產生備份字串',
    importTitle: '匯入備份',
    importDesc: '貼上備份字串，還原帳戶或設定',
    storageWarningTitle: '儲存注意事項',
    storageWarning: '你的資料僅儲存於此裝置的瀏覽器中，清除瀏覽資料或解除安裝可能導致資料遺失。建議定期備份。',
    storageWarningIOS: '在 iOS/iPadOS 上，若未將應用程式加入主畫面，Safari 可能在 7 天無使用後自動清除資料。',
    storageWarningBtn: '了解',
  },

  /* ─── ExportDialog ─────────────────────────────────────── */
  exportDialog: {
    title: '匯出備份',
    subtitle: '選擇要備份的項目，產生備份字串',
    categoriesLabel: '備份項目',
    catAccounts: '收款帳戶',
    catAccountsDesc: (n: number) => `${n} 個帳戶`,
    catStyle: '風格',
    catStyleAccent: '主題色彩',
    catStyleQR: 'QR Code 樣式',
    catPreferences: '偏好設定',
    catPrefsMode: '外觀模式',
    catPrefsLocale: '語系',
    catPaymentLinks: (n: number) => `支付 App 連結（${n} 個）`,
    passwordLabel: '設定密碼',
    passwordOptional: '（選填）',
    passwordPlaceholder: '不設定密碼則留空',
    confirmPasswordLabel: '確認密碼',
    confirmPasswordPlaceholder: '再次輸入密碼',
    infoWithPassword: '你的帳戶資料將以 AES-256 加密，匯入時需輸入密碼。',
    infoWithoutPassword: '不設定密碼時，任何人取得此字串皆可匯入。',
    noAccounts: '沒有帳戶可以匯出',
    passwordMismatch: '密碼不一致',
    exporting: '匯出中…',
    export: '匯出',
    copyBackup: '複製備份字串',
    copied: '已複製',
    shareViaApp: '透過其他 App 分享',
    shared: '已分享',
    copyFailed: '複製失敗',
    shareFailed: '分享失敗',
    exportFailed: '匯出失敗',
  },

  /* ─── ImportDialog ─────────────────────────────────────── */
  importDialog: {
    title: '匯入備份',
    subtitle: '貼上備份字串，預覽並選擇要還原的項目',
    inputPlaceholder: 'OTWQR1-...',
    inputLabel: '備份字串',
    passwordLabel: '輸入密碼',
    passwordPlaceholder: '輸入匯出時設定的密碼',
    emptyInput: '請貼上備份字串',
    invalidString: '無效的備份字串',
    wrongPassword: '密碼錯誤',
    importError: '匯入失敗，字串可能已損壞',
    importing: '匯入中…',
    import: '匯入',
    summary: (total: number, newCount: number) =>
      `共 ${total} 個帳戶，${newCount} 個為新帳戶`,
    selectAll: '全選',
    selectNewOnly: '只選新帳戶',
    existing: '已存在',
    nicknamePlaceholder: '帳戶暱稱（選填）',
    addNickname: '新增暱稱',
    selectLabel: (checked: boolean, name: string) =>
      `${checked ? '取消選取' : '選取'} ${name}`,
    confirmImport: '確認匯入',
    catAccounts: '收款帳戶',
    catStyle: '風格',
    catStyleAccent: '主題色彩',
    catStyleQR: 'QR Code 樣式',
    catPreferences: '偏好設定',
    catPrefsMode: '外觀模式',
    catPrefsLocale: '語系',
    catPaymentLinks: (n: number) => `支付 App 連結（${n} 個）`,
    paymentLinkConflict: '已有相同設定',
    paymentLinkOverwrite: '覆蓋',
    paymentLinkKeep: '保留',
    paymentLinksNewDesc: (n: number) => `+${n} 個新連結將直接新增`,
    successTitle: '匯入完成',
    successDesc: (n: number) => n === 0 ? '所選帳戶已是最新狀態，無需更新' : `成功處理 ${n} 個帳戶`,
    settingsApplied: '風格與偏好設定已套用',
  },

  /* ─── SafetySection ────────────────────────────────────── */
  safety: {
    sectionTitle: '隱私與安全',
    infoTitle: '隱私與安全資訊',
    infoDesc: '了解資料保護與轉帳安全注意事項',
    modalTitle: '隱私與安全',
    privacyTitle: '隱私聲明',
    privacyDesc: 'QR Code 皆在您的瀏覽器本地產生，帳戶資料僅儲存於此裝置，不會上傳至任何伺服器。',
    securityTitle: '安全提醒',
    securityDesc: '轉帳前請務必於銀行 App 中核對收款帳號與戶名，確認無誤後再執行轉帳。',
    scamTitle: '防範三方詐騙',
    scamDesc: '切勿依不明來源提供的帳號進行轉帳。若有人要求您代為收款再轉出，很可能是三方詐騙手法，請提高警覺。',
  },

  /* ─── AboutSection ─────────────────────────────────────── */
  about: {
    sectionTitle: '關於',
    sponsorTitle: '贊助開發者',
    sponsorDesc: '請 AI 吃點 Token，支持專案持續維護',
    githubTitle: 'GitHub 原始碼',
    githubDesc: '檢視原始碼、回報問題或參與貢獻',
    versionTitle: '版本資訊',
    versionDesc: (hash: string) => `建置版本：${hash}`,
    checkUpdateTitle: '檢查更新',
    checkUpdateDesc: '手動檢查是否有新版本可用',
    checkingUpdate: '檢查中…',
    upToDate: '已是最新版本',
    updateAvailable: '發現新版本，即將更新',
    checkFailed: '檢查失敗，請稍後再試',
  },

  /* ─── Bottom Navigation ────────────────────────────────── */
  nav: {
    receive: '收款',
    scan: '掃描',
    accounts: '帳戶',
    settings: '設定',
    ariaLabel: '主要導覽',
  },

  /* ─── ScanPage ─────────────────────────────────────────── */
  scan: {
    title: '掃描 QR Code',
    hint: '將 QR Code 對準框內',
    unsupportedTitle: '不支援掃描功能',
    unsupportedDesc: '您的瀏覽器不支援相機掃描，請改用圖片上傳或更換瀏覽器。',
    permissionTitle: '需要相機權限',
    permissionDesc: '請允許使用相機以掃描 QR Code。',
    noCameraTitle: '找不到相機',
    noCameraDesc: '您的裝置似乎沒有可用的相機，可改用圖片上傳方式。',
    unknownErrorTitle: '相機發生錯誤',
    unknownErrorDesc: '啟動相機時發生未預期的錯誤，您可以重試或改用圖片上傳。',
    uploadImage: '上傳圖片',
    torchOn: '開啟閃光燈',
    torchOff: '關閉閃光燈',
    noQRFound: '圖片中未偵測到 QR Code',
    decodeFailed: '無法解碼圖片',
    unknownBank: '未知機構',
    amount: '金額',
    note: '備註',
    openBankApp: '開啟支付 App',
    openLink: '開啟連結',
    showResult: '顯示付款資訊',
    showQR: '顯示 QR Code',
    copyAccount: '複製帳號',
    copiedAccount: '已複製帳號',
    copyRaw: '複製內容',
    copied: '已複製',
    rescan: '重新掃描',
    rawResult: '掃描結果',
    retry: '重試',
  },

  /* ─── URL Scheme Settings ──────────────────────────────── */
  urlScheme: {
    sectionTitle: '支付 App 連動',
    sectionDesc: '掃描後快速開啟支付 App',
    manageTitle: '支付 App 連動',
    entryRow: '管理支付連動設定',
    entryDesc: '掃描 QR Code 後快速開啟支付 App',
    configCount: (n: number) => `${n} 間機構`,
    emptyTitle: '尚無設定',
    emptyHint: '設定連動後，掃描 QR Code 即可一鍵開啟支付 App。',
    addBank: '新增支付連動',
    addLabel: '新增連動',
    editTitle: '編輯支付連動',
    addTitle: '新增支付連動',
    urlLabel: 'URL 範本',
    urlPlaceholder: 'https://bank.example.com/pay?acct={account}',
    placeholderHelp: '佔位符說明',
    placeholderTitle: '可用的佔位符：',
    phAccount: '帳號',
    phPaddedAccount: '16 位帳號（前面補 0）',
    phBankCode: '銀行代碼',
    phAmount: '金額（新台幣）',
    phAmountCents: '金額（分，新台幣×100）',
    phNote: '備註（已 URL 編碼）',

    deleteTitle: '刪除支付連動',
    deleteConfirm: '確定要刪除此支付連動設定嗎？此操作無法復原。',
    save: '儲存',
  },

  /* ─── AuthLockScreen ───────────────────────────────────── */
  auth: {
    promptDesc: '請驗證身分以解鎖應用程式',
    unlock: '解鎖',
    authenticating: '驗證中…',
    authFailed: '驗證失敗，請再試一次',
  },

  /* ─── SharedPage ───────────────────────────────────────── */
  shared: {
    needPasswordTitle: '需要密碼',
    needPasswordDesc: '此收款連結受密碼保護，請輸入密碼以查看。',
    passwordPlaceholder: '輸入密碼…',
    passwordLabel: '連結密碼',
    wrongPassword: '密碼錯誤，請重新輸入',
    unlocking: '解鎖中…',
    unlock: '解鎖',
    expiredTitle: '連結已過期',
    expiredDesc: '此收款連結已超過有效期限，無法繼續使用。',
    invalidTitle: '連結無效',
    invalidDesc: '此收款連結無法解析，可能已損壞或格式不正確。',
  },

  /* ─── ThemeToggle ──────────────────────────────────────── */
  theme: {
    system: '跟隨系統',
    light: '淺色模式',
    dark: '深色模式',
  },

  /* ─── LanguageToggle ───────────────────────────────────── */
  language: {
    toggleLabel: '切換語言',
    zh: '中文',
    en: 'English',
  },

  /* ─── InstallPrompt ────────────────────────────────────── */
  install: {
    dismiss: '關閉安裝提示',
    ariaLabel: '安裝應用程式',
    title: '安裝 OpenTWQR',
    chromiumDesc: '安裝至主畫面，離線也能使用，收款更快速。',
    chromiumButton: '安裝應用程式',
    iosInstructionBefore: '點擊底部',
    iosShareLabel: '分享',
    iosInstructionAfter: '分享按鈕，再選擇「',
    iosActionLabel: '加入主畫面',
    iosInstructionEnd: '」即可安裝。',
  },

  /* ─── ReloadPrompt ─────────────────────────────────────── */
  reload: {
    newVersion: '有新版本可用',
    update: '更新',
    later: '稍後',
    dismiss: '關閉',
  },
  /* ─── ErrorBoundary ────────────────────────────────────── */
  errorBoundary: {
    title: '發生錯誤',
    desc: '應用程式發生預期外的錯誤，請重新整理後再試。',
    refresh: '重新整理',
  },
  /* ─── ShareTarget ─────────────────────────────────────── */
  shareTarget: {
    prompt: '要用這個收款帳號做什麼？',
    addAccount: '存為我的帳號',
    addAccountDesc: '加入收款帳號清單，方便下次產生 QR Code',
    pay: '前往支付',
    payDesc: '查看付款資訊，並開啟支付 App 或 QR Code',
  },
  /* ─── DangerSection ─────────────────────────────────── */
  danger: {
    sectionTitle: '危險操作',
    resetTitle: '重置所有資料',
    resetDesc: '清除所有帳戶、設定與偏好設定，回復初始狀態',
    resetConfirmTitle: '確定要重置所有資料？',
    resetConfirmDesc: '此操作將永久刪除所有帳戶、備份、偏好設定和應用程式資料，無法復原。',
    resetConfirm: '重置所有資料',
    resetCancel: '取消',
  },

  /* ─── Onboarding ──────────────────────────────────── */
  onboarding: {
    skip: '略過',
    next: '下一步',
    getStarted: '開始使用',
    step1Title: '歡迎使用 OpenTWQR',
    step1Desc: '免費產生 TWQR 個人收款 QR Code，對方用銀行 App 掃碼即可轉帳。',
    step2Title: '新增你的收款帳戶',
    step2Desc: '先新增一個收款帳戶，之後就能快速產生收款 QR Code。',
    step3Title: '分享與備份',
    step3Desc: '支援分享連結、下載圖片，也能加密備份帳戶資料。',
  },
} as const;

/**
 * Recursively widen string literal types to `string` so that en-US (and
 * future locales) can satisfy the same shape without matching the exact
 * Chinese characters.  Function signatures are preserved as-is.
 */
type Widen<T> =
  T extends (...args: infer A) => infer R ? (...args: A) => Widen<R>
  : T extends Record<string, unknown> ? { [K in keyof T]: Widen<T[K]> }
  : T extends string ? string
  : T extends number ? number
  : T;

export default zhTW;
export type Translations = Widen<typeof zhTW>;
