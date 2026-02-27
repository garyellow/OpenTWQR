# OpenTWQR

[![Deploy](https://img.shields.io/github/deployments/garyellow/OpenTWQR/github-pages?label=deploy&logo=github)](https://pay.garyellow.app)
[![License](https://img.shields.io/github/license/garyellow/OpenTWQR)](./LICENSE)
[![Fork](https://img.shields.io/github/forks/garyellow/OpenTWQR?style=flat&logo=github&logoColor=white)](https://github.com/garyellow/OpenTWQR/fork)

**在你的手機上，即時產生台灣 Pay（TWQR）個人收款 QR Code。**

完全免費、開放原始碼、不需註冊、不會上傳資料——帳戶資訊只儲存在你自己的裝置上。

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/screenshots/receive-dark.png" />
    <img src="public/screenshots/receive-light.png" alt="OpenTWQR 收款畫面" width="320" />
  </picture>
</p>

## 立即使用

前往 **[pay.garyellow.app](https://pay.garyellow.app)** 開始使用，無需安裝。

> 也可以將網頁「加入主畫面」，就像一般 App 一樣使用，離線也能產生收款碼。

## 功能特色

- **快速收款** — 新增銀行帳戶、輸入金額、產生 QR Code，讓對方用任何支援台灣 Pay 的銀行 App 掃碼轉帳
- **多帳戶管理** — 支援多組銀行帳戶，可設定暱稱並一鍵切換
- **安全分享** — 透過端對端加密連結分享收款碼，可設定密碼與有效期
- **備份與匯入** — 帳戶資料可匯出為加密字串，輕鬆轉移至其他裝置
- **離線可用** — 安裝為 App 後，無需網路也能產生收款 QR Code
- **深色模式** — 淺色、深色與跟隨系統三種顯示模式
- **App 鎖定** — 透過裝置驗證（Face ID、指紋、PIN 等）保護帳戶資料
- **鍵盤快捷鍵** — 桌面版可用數字鍵輸入金額，按 Enter 產生 QR Code

## 隱私與安全

| | |
|---|---|
| **資料在哪裡** | 所有帳戶資料只儲存在你的裝置上，不會傳到任何伺服器 |
| **分享連結** | 使用 AES-256-GCM 端對端加密，解密金鑰保留在 URL 片段中（不會傳送至伺服器） |
| **密碼保護** | 可為分享連結設定密碼，採用 PBKDF2 600,000 次迭代防止暴力破解 |
| **連結有效期** | 可設定 10 分鐘、1 小時或 1 天自動失效 |
| **開放原始碼** | 程式碼完全公開，歡迎檢視與貢獻 |

## 常見問題

<details>
<summary><strong>這跟台灣 Pay App 有什麼不同？</strong></summary>

OpenTWQR 只負責「產生收款 QR Code」，讓對方用自己的銀行 App 掃碼付款。它不是一個支付 App，不會處理金流，也不需要你登入任何銀行帳號。
</details>

<details>
<summary><strong>對方需要安裝 OpenTWQR 嗎？</strong></summary>

不需要。對方只要用任何支援台灣 Pay（TWQR）的銀行 App 掃描 QR Code 就能轉帳。
</details>

<details>
<summary><strong>我的資料安全嗎？</strong></summary>

所有帳戶資料完全儲存在你的裝置上（瀏覽器的 IndexedDB），不會上傳到伺服器。分享連結採用端對端加密，即使連結經過伺服器，伺服器也看不到你的帳戶資訊。
</details>

<details>
<summary><strong>銀行清單多久更新一次？</strong></summary>

銀行清單資料來自財金資訊股份有限公司的公開資料，每日自動更新。App 內建清單確保離線也能使用。
</details>

<details>
<summary><strong>支援哪些瀏覽器？</strong></summary>

支援所有主流瀏覽器，包括 Chrome、Safari、Edge、Firefox。在 iOS Safari 或 Android Chrome 上可安裝為 PWA App。
</details>

## 自行架設

如果你想在自己的 GitHub Pages 上架設 OpenTWQR，可以按照以下步驟操作。

<a href="https://github.com/garyellow/OpenTWQR/fork">
  <img src="https://img.shields.io/badge/Fork%20this%20repo-181717?style=for-the-badge&logo=github&logoColor=white" alt="Fork this repo" />
</a>

<details>
<summary><strong>展開架設步驟</strong></summary>

### 1. Fork 專案

點擊上方按鈕或前往 [Fork 頁面](https://github.com/garyellow/OpenTWQR/fork) 將專案 Fork 到你的帳號下。

### 2. 刪除 CNAME 檔案

Fork 後，**刪除**以下兩個檔案（它們指向原作者的自訂網域，會導致你的部署失敗）：

- `CNAME`（專案根目錄）
- `public/CNAME`（public 資料夾內）

你可以直接在 GitHub 網頁上操作：點進檔案 → 右上角垃圾桶圖示 → Commit changes。

### 3. 啟用 GitHub Pages

1. 前往你 Fork 的 Repository → **Settings** → **Pages**
2. **Source** 選擇 **GitHub Actions**
3. 回到 **Actions** 頁籤，原本停用的 Workflow 需要手動啟用：點擊 "I understand my workflows, go ahead and enable them"
4. 手動執行一次 **Deploy to GitHub Pages** Workflow（Actions → Deploy to GitHub Pages → Run workflow）

### 4. 完成

部署完成後，你的網站將會在 `https://<你的帳號>.github.io/OpenTWQR/` 上線。

> **注意**：如果你的 Fork 使用子路徑（如 `/OpenTWQR/`），你需要在 `vite.config.ts` 中設定 `base: '/OpenTWQR/'`，否則靜態資源的路徑會不正確。

### 5.（選用）設定自訂網域

如果你有自己的網域：

1. 在 `public/` 資料夾下新增 `CNAME` 檔案，寫入你的網域（例如 `pay.example.com`）
2. 在專案根目錄也新增 `CNAME` 檔案，內容相同
3. 在你的 DNS 設定中，將該網域指向 `<你的帳號>.github.io`

使用自訂網域時，`vite.config.ts` 的 `base` 選項應維持預設值 `'/'`。

</details>

## 授權

本專案採用 [MIT 授權條款](LICENSE)。
