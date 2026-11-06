# 旅行行程 PWA 共用模板

這是一套以 JSON 為資料來源的個人旅行行程 PWA。

## 專案架構

| 檔案 | 用途 |
|---|---|
| index.html | 頁面結構 |
| styles.css | 頁面樣式 |
| app.js | 行程資料載入與畫面產生 |
| trip-data.json | 旅程資料，主要修改檔案 |
| manifest.json | PWA 安裝設定 |
| sw.js | 離線快取 |
| icon.svg | PWA 圖示 |
| .github/workflows/pages.yml | GitHub Pages 自動部署 |

## 建立新旅程

1. 建立新的 GitHub repository。
2. 將本專案所有檔案放入 repository。
3. 修改 trip-data.json。
4. 推送到 main。
5. 到 GitHub Settings → Pages 確認使用 GitHub Actions。
6. 等待 GitHub Actions 部署完成。

## 主要修改位置

日常行程調整只需要修改：

`trip-data.json`

可修改項目：

- trip_id：旅程唯一識別碼
- trip_name：旅程名稱
- subtitle：副標題
- trip_start / trip_end：起訖日期
- theme：配色
- summary：行程總覽
- flights：航班
- todos：待辦事項
- days：每日行程

## 每日行程格式

每一天使用 ISO 日期格式：

`YYYY-MM-DD`

例如：

```json
{
  "date": "2026-11-15",
  "city": "大津",
  "lodging": "住宿名稱",
  "items": [
    {
      "time": "09:00",
      "title": "活動名稱",
      "description": "活動說明",
      "type": "activity",
      "location": "地點名稱"
    }
  ]
}