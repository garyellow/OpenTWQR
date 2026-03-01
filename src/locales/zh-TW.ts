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
  },

  /* ─── ReceivePage ──────────────────────────────────────── */
  receive: {
    settings: '設定',
    myAccount: '我的帳戶',
    addBankAccount: '新增銀行帳戶',
    importAccounts: '匯入帳戶',
    emptyHint: '新增銀行帳戶即可開始產生收款 QR Code。',
    generateQR: '產生 QR Code',
    quickQR: '快速產碼',
    quickQRDesc: '不建立帳戶，直接輸入帳號產生 QR Code',
    quickQRTitle: '快速產碼',
    quickQRGenerate: '產生 QR Code',
    quickQRSave: '儲存此帳戶',
    quickQRSaved: '已儲存帳戶',
    addNote: '新增交易備註',
    noteTitle: '交易備註',
    noteLabel: '交易備註',
    notePlaceholder: '輸入備註，最多 19 字…',
    clearNote: '清除備註',
    bankCode: (code: string) => `（${code}）`,
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
    encrypting: '加密中…',
    copyLinkAction: '複製連結',
    shareLinkAction: '分享連結',
    encryptFailed: '加密失敗',
  },

  /* ─── AccountsPage ─────────────────────────────────────── */
  accounts: {
    title: '帳戶管理',
    importLabel: '匯入帳戶',
    addLabel: '新增帳戶',
    emptyTitle: '尚無帳戶',
    emptyHint: '新增銀行帳戶即可開始透過 TWQR 收款。',
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
    bankLabel: '銀行',
    bankHint: '收款帳戶所屬的金融機構',
    bankPlaceholder: '請選擇銀行…',
    accountLabel: '帳號',
    accountPlaceholder: '輸入銀行帳號…',
    accountHint: '10–16 位數字，不含分行代碼',
    nicknameLabel: '帳戶暱稱（選填）',
    nicknamePlaceholder: '例如：郵局、薪轉戶…',
    nicknameHint: '方便區分不同帳戶用途',
    iconLabel: '自訂圖示（選填）',
    iconHint: '可以填入圖片網址，也可以填入官網網址',
    saveAccount: '儲存帳戶',
    selectBank: '請選擇銀行',
    invalidAccount: '帳號必須為 10–16 位數字',
    duplicateExact: '此帳戶已存在',
    duplicateWarn: '你已經有一個相同的銀行帳號，確定要再新增嗎？',
    addAnyway: '仍要新增',
  },

  /* ─── BankSelect ───────────────────────────────────────── */
  bankSelect: {
    title: '選擇銀行',
    searchPlaceholder: '搜尋銀行名稱或代碼…',
    searchLabel: '搜尋銀行名稱或代碼',
    found: (count: number) => `找到 ${count} 家銀行`,
    noResult: (q: string) => `找不到「${q}」的搜尋結果`,
  },

  /* ─── SettingsPage ─────────────────────────────────────── */
  settings: {
    title: '設定',
  },

  /* ─── QRSettingsSection ────────────────────────────────── */
  qrSettings: {
    sectionTitle: 'QR Code 顯示',
    logoTitle: '中央圖示',
    logoDesc: '選擇 QR Code 中央顯示的圖示',
    logoOpenTWQR: 'Open TWQR',
    logoBankIcon: '銀行圖示',
    customNameTitle: '自訂名稱',
    customNameDesc: '標示這是誰的收款碼',
    customNamePlaceholder: '例如：小明…',
    bankNameTitle: '顯示銀行名稱',
    bankNameDesc: '在 QR Code 下方顯示官方銀行名稱',
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
    lockTimeoutTitle: '背景鎖定時間',
    lockTimeoutDesc: '切換到背景超過此時間後，需重新驗證身分',
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
    200: '水波藍',
    250: '靛青藍',
    285: '薰衣紫',
    340: '玫瑰粉',
    15: '珊瑚紅',
    55: '琥珀橘',
    145: '翡翠綠',
    175: '青碧',
  } as Record<number, string>,

  /* ─── BackupSection ────────────────────────────────────── */
  backup: {
    sectionTitle: '資料備份',
    exportTitle: '匯出帳戶',
    exportDesc: '產生加密字串，可複製保存或傳送',
    importTitle: '匯入帳戶',
    importDesc: '貼上加密字串以還原帳戶資料',
  },

  /* ─── ExportDialog ─────────────────────────────────────── */
  exportDialog: {
    title: '匯出帳戶',
    subtitle: '所有帳戶將被加密為一段字串',
    passwordLabel: '設定密碼',
    passwordOptional: '（選填）',
    passwordPlaceholder: '不設定密碼則留空',
    confirmPasswordLabel: '確認密碼',
    confirmPasswordPlaceholder: '再次輸入密碼',
    infoWithPassword: '你的帳戶資料將以 AES-256 加密，匯入時需輸入密碼。',
    infoWithoutPassword: '不設定密碼時，任何人取得此字串皆可匯入。',
    noAccounts: '沒有帳戶可以匯出',
    passwordMismatch: '密碼不一致',
    encrypting: '加密中…',
    export: '匯出',
    copyEncrypted: '複製加密字串',
    copied: '已複製',
    shareViaApp: '透過其他 App 分享',
    shared: '已分享',
    copyFailed: '複製失敗',
    shareFailed: '分享失敗',
    encryptFailed: '加密失敗',
  },

  /* ─── ImportDialog ─────────────────────────────────────── */
  importDialog: {
    title: '匯入帳戶',
    subtitle: '貼上先前匯出的加密字串',
    inputPlaceholder: 'OTWQR1-...',
    inputLabel: '匯入加密字串',
    passwordLabel: '輸入密碼',
    passwordPlaceholder: '輸入匯出時設定的密碼',
    emptyInput: '請貼上備份字串',
    invalidString: '無效的備份字串',
    wrongPassword: '密碼錯誤',
    decryptError: '解密失敗，字串可能已損壞',
    decrypting: '解密中…',
    decrypt: '解密',
    summary: (total: number, newCount: number) =>
      `共 ${total} 個帳戶，${newCount} 個為新帳戶`,
    selectAll: '全選',
    selectNewOnly: '只選新帳戶',
    existing: '已存在',
    nicknamePlaceholder: '帳戶暱稱（選填）',
    addNickname: '新增暱稱',
    selectLabel: (checked: boolean, name: string) =>
      `${checked ? '取消選取' : '選取'} ${name}`,
    importCount: (n: number) => `匯入 ${n} 個帳戶`,
    successTitle: '匯入完成',
    successDesc: (n: number) => `成功匯入 ${n} 個帳戶`,
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
    decrypting: '解密中…',
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
