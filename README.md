<div align="center">

# OpenTWQR

[![Deploy](https://img.shields.io/github/deployments/garyellow/OpenTWQR/github-pages?label=deploy&logo=github)](https://pay.garyellow.app)
[![License](https://img.shields.io/github/license/garyellow/OpenTWQR)](./LICENSE)
[![Fork](https://img.shields.io/github/forks/garyellow/OpenTWQR?style=flat&logo=github&logoColor=white)](https://github.com/garyellow/OpenTWQR/fork)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-請%20AI%20吃點%20Token-72a4f2?logo=ko-fi&logoColor=white)](https://ko-fi.com/garyellow)

[English](README-EN.md) ·
[繁體中文](README.md)

**在你的手機上，即時產生 TWQR 個人收款 QR Code。**

完全免費、開放原始碼、無需註冊——帳戶資料只儲存在你自己的裝置上。

<br />

<table>
  <tr>
    <th colspan="2">📱 手機版</th>
  </tr>
  <tr>
    <td align="center">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="public/screenshots/welcome-mobile-dark.png" />
        <img src="public/screenshots/welcome-mobile-light.png" alt="OpenTWQR 歡迎畫面（手機版）" width="200" />
      </picture>
      <br />
      <sub>歡迎畫面</sub>
    </td>
    <td align="center">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="public/screenshots/main-mobile-dark.png" />
        <img src="public/screenshots/main-mobile-light.png" alt="OpenTWQR 主頁（手機版）" width="200" />
      </picture>
      <br />
      <sub>主頁</sub>
    </td>
  </tr>
  <tr>
    <th colspan="2">🖥️ 桌面版</th>
  </tr>
  <tr>
    <td align="center" colspan="2">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="public/screenshots/main-desktop-dark.png" />
        <img src="public/screenshots/main-desktop-light.png" alt="OpenTWQR 主頁（桌面版）" width="600" />
      </picture>
      <br />
      <sub>主頁</sub>
    </td>
  </tr>
</table>

<br />

<a href="https://pay.garyellow.app"><strong>立即使用 →</strong></a>

</div>

<br />

> [!TIP]
> 也可以將網頁加入主畫面，像一般 App 一樣使用，離線也能產生收款碼。

> [!IMPORTANT]
> **本專案為社群開源專案，與 TWQR 官方（財金資訊股份有限公司）無任何關聯。** OpenTWQR 僅產生符合 TWQR 規格的 QR Code，不涉及任何金流處理。詳細聲明請參閱下方[商標與聲明](#商標與聲明)段落。

---

## TWQR 是什麼？

**TWQR（Taiwan QR Code）** 是由財金資訊股份有限公司制定的 QR Code 共通支付標準，統一了國內銀行與電子支付機構的 QR Code 格式。TWQR 涵蓋了多種使用場景，包括商家購物付款、個人轉帳、繳費、繳稅等。

**OpenTWQR 專注於「個人轉帳收款」這個場景**——讓你快速產生含有自己銀行帳號的 QR Code，對方用銀行 App 掃碼即可直接轉帳給你，不需額外安裝任何 App。這與商家在店面使用的 TWQR 購物付款碼是不同的用途。

> [!NOTE]
> TWQR 是 QR Code「格式標準」，而台灣 Pay 是財金公司推出的「支付 App」，兩者並不相同。OpenTWQR 產生的 QR Code 可被所有支援 TWQR 的銀行 App 及電子支付 App 掃描，不限於台灣 Pay。

## 功能特色

- **即時收款** — 選擇帳戶或直接輸入帳號，一鍵產生 TWQR 收款 QR Code，無需建立帳號或安裝任何 App
- **多帳戶管理** — 儲存多組收款帳戶並設定暱稱，在收款頁與收款 QR Code 視窗使用一致的帳戶選擇卡；點一下即可開啟帳戶清單，也能透過 QR 兩側箭頭、滑動或方向鍵快速切換
- **掃描付款** — 掃描任意 TWQR QR Code，自動解析帳號與金額，即可分享收款碼或跳轉轉帳 App
- **轉帳 App 連動** — 自訂含動態佔位符的 URL 範本，掃描後解析參數並直接開啟目標 App
- **安全分享** — 透過端對端加密連結分享收款碼，可設定密碼保護與自動到期時間
- **備份與轉移** — 匯出加密備份字串，隨時還原帳戶與設定到任何裝置
- **離線可用** — 可加入主畫面安裝為 App，無需網路也能隨時產生收款碼
- **完整個人化** — 深色模式、App 鎖定（Face ID／指紋）、自訂主題色，以及中英文介面切換

## 隱私與安全

| | |
| :--- | :--- |
| **資料儲存** | 所有帳戶資料僅儲存在你的裝置上，不會傳送至任何伺服器。 |
| **分享連結** | 使用 AES-256-GCM 端對端加密，解密金鑰保留在 URL 片段中，不會經過伺服器。 |
| **密碼保護** | 可為分享連結設定密碼，採用 PBKDF2 600,000 次迭代防止暴力破解。 |
| **連結有效期** | 可設定 10 分鐘、1 小時或 1 天自動失效。 |
| **開放原始碼** | 程式碼完全公開，歡迎檢視與貢獻。 |

## 常見問題

<details>
<summary><strong>這跟台灣 Pay App 有什麼不同？</strong></summary>
<br />

台灣 Pay 是財金公司推出的支付 App，可用於購物、轉帳、繳費等。OpenTWQR 只負責「產生個人收款 QR Code」，讓對方用銀行 App 掃碼轉帳——它不是支付 App，不處理任何金流，也不需要登入銀行帳號。
</details>

<details>
<summary><strong>OpenTWQR 產生的 QR Code 跟商家的 TWQR 付款碼有什麼不同？</strong></summary>
<br />

TWQR 標準涵蓋多種場景：商家購物付款、個人轉帳、繳費、繳稅等。OpenTWQR 產生的是「個人轉帳」用途的 QR Code——內含你的銀行帳號資訊，對方掃碼後會透過銀行 App 直接轉帳，並非商家購物付款的流程。
</details>

<details>
<summary><strong>對方需要安裝 OpenTWQR 嗎？</strong></summary>
<br />

不需要。對方只要用任何支援 TWQR 的銀行 App 或電子支付 App 掃描 QR Code，就能完成轉帳。
</details>

<details>
<summary><strong>我的資料安全嗎？</strong></summary>
<br />

所有帳戶資料完全儲存在你的裝置上（瀏覽器的 IndexedDB），不會上傳至伺服器。分享連結採用端對端加密——即使連結經由伺服器傳遞，伺服器也無法取得你的帳戶資訊。
</details>

<details>
<summary><strong>金融機構清單多久更新一次？</strong></summary>
<br />

金融機構清單來自金融監督管理委員會銀行局的公開資料，涵蓋本國銀行、外國銀行、信用合作社、陸資銀行及電子支付機構，每日透過 GitHub Actions 自動更新。App 內建清單確保離線時也能正常使用。
</details>

<details>
<summary><strong>支援哪些瀏覽器？</strong></summary>
<br />

支援所有主流瀏覽器，包括 Chrome、Safari、Edge、Firefox。在 iOS Safari 或 Android Chrome 上可安裝為 PWA App。
</details>

<details>
<summary><strong>收款金額有上限嗎？</strong></summary>
<br />

OpenTWQR 的單筆金額上限設定為 NT$2,000,000。不輸入金額時，付款方可在銀行 App 中自行填入。實際可轉帳金額依各金融機構規定而異。
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

> [!WARNING]
> 如果你的 Fork 使用子路徑（如 `/OpenTWQR/`），你需要在 `vite.config.ts` 中設定 `base: '/OpenTWQR/'`，否則靜態資源的路徑會不正確。

### 5.（選用）設定自訂網域

如果你有自己的網域：

1. 在 `public/` 資料夾下新增 `CNAME` 檔案，寫入你的網域（例如 `pay.example.com`）
2. 在專案根目錄也新增 `CNAME` 檔案，內容相同
3. 在你的 DNS 設定中，將該網域指向 `<你的帳號>.github.io`

使用自訂網域時，`vite.config.ts` 的 `base` 選項應維持預設值 `'/'`。

</details>

## 貢獻

歡迎開 [Issue](https://github.com/garyellow/OpenTWQR/issues) 回報問題或提出建議，也歡迎直接發送 [Pull Request](https://github.com/garyellow/OpenTWQR/pulls)。

## 贊助

覺得好用的話，請我的 AI 吃點 Token 吧 🤖✨

<a href="https://ko-fi.com/garyellow">
  <img src="https://img.shields.io/badge/Ko--fi-請%20AI%20吃點%20Token-72a4f2?style=for-the-badge&logo=ko-fi&logoColor=white" alt="在 Ko-fi 上贊助開發者" height="36" />
</a>

## 商標與聲明

- **OpenTWQR** 是一個由社群獨立開發的開放原始碼專案，**與財金資訊股份有限公司及其推出的 TWQR 共通支付標準、台灣 Pay 服務等均無任何隸屬、合作、代理或背書關係。**
- 應用程式介面中使用了類似 TWQR 標誌的視覺元素，其目的僅為幫助使用者快速辨識所產生的 QR Code 所遵循的格式標準，並非意圖暗示本專案為官方產品或獲得官方授權。
- 「TWQR」名稱及相關商標權利歸財金資訊股份有限公司所有。如有任何商標疑慮，歡迎透過 [Issue](https://github.com/garyellow/OpenTWQR/issues) 與我們聯繫。
- 本專案不處理任何金融交易或金流，僅提供 QR Code 產生、顯示與分享功能。使用者因掃描 QR Code 所進行的轉帳行為，均由使用者自行透過各銀行或支付機構完成。

## 授權

本專案採用 [MIT 授權條款](LICENSE)。
