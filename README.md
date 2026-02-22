# OpenTWQR

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

## 注意事項

- 本專案不儲存密碼或任何伺服器端資料
