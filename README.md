# OpenTWQR

**線上使用：https://pay.garyellow.app**

OpenTWQR 是一個純前端的台灣個人收款 QR 產生器（TWQRP://）。
支援 PWA 安裝、本地資料儲存、離線開啟與顯示已存在帳戶資料。

## 核心功能

- 只保留收款流程：輸入金額 → 產生 QR → 對方掃碼轉帳
- 帳戶管理（新增 / 編輯 / 刪除 / 選擇預設帳戶）
- 使用 `zustand + persist` 將帳戶資料存在本機 `localStorage`
- TWQRP 字串由 `src/utils/twqr.ts` 生成（含 16 碼帳號補零、金額 * 100）

## PWA / 離線

- 透過 `vite-plugin-pwa` 產生 `sw.js` 與 `manifest.webmanifest`
- 安裝後可離線開啟 App Shell 與使用已快取資源
- 帳戶資料為本機儲存，無後端依賴
- 銀行清單內建於前端資源，無網路時自動使用內建清單（Fallback）

## 部署

部署至 GitHub Pages，自定義網域 `pay.garyellow.app`。

- 自動部署：push to `main` 觸發 `.github/workflows/deploy.yml`
- `public/CNAME` 確保每次部署後自定義網域不被重置
- `public/404.html` 處理 GitHub Pages SPA 路由（直接進入子路徑 / 重新整理）

## 銀行資料更新策略

- 官方來源：財金資訊股份有限公司 OpenData XML
	- `https://www.fisc.com.tw/TC/OPENDATA/Comm1_MEMBER.xml`
- 擷取範圍：`跨行自動化服務機器業務(金融卡)`（收款情境較不會出現意外選項）
- 自動更新：透過 GitHub Actions 每週排程更新一次
	- Workflow：`.github/workflows/update-banks.yml`
	- 排程：每週一 `00:00 UTC`（台灣時間週一 `08:00`）
- 產出檔案：
	- `src/data/banks.generated.ts`（App 內建資料，離線可用）
	- `public/data/banks.latest.json`（可對外檢視版本）
- 手動更新指令：`npm run update:banks`

## 銀行清單生命週期

- 啟動 App 時：先使用內建銀行清單，確保離線可立即使用。
- 有網路時：背景抓取 `/data/banks.latest.json`，成功後即更新 App 清單與本機快取。
- 重新連網時：自動再次同步，降低長時間離線造成的資料落差。
- 無網路或抓取失敗時：維持既有清單，不中斷收款操作。

## 開發指令

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## 技術堆疊

- React 19 + TypeScript + Vite
- Tailwind CSS
- React Router
- Zustand
- qrcode.react

## 專案結構

- `src/pages`：主要頁面（收款頁 / 帳戶頁）
- `src/components`：UI 元件
- `src/stores`：狀態管理與本地持久化
- `src/utils/twqr.ts`：TWQRP 產生邏輯
