# IRON BAR ARENA｜單槓持久度極限競賽網頁

熱血街機電競風格的單槓懸吊持久度競賽網頁，具備動態吊單槓選手動畫、倒數上槓提示音、即時能量階級切換、螢幕防休眠 (Wake Lock)、破紀錄煙火特效，以及跨裝置即時同步排行榜。

## 快速本機預覽

在專案資料夾內啟動任意靜態伺服器即可開啟：

```powershell
python -m http.server 8080
```

接著在瀏覽器開啟 `http://localhost:8080`。

> 未設定 Supabase 時，網頁會自動以「本地展示模式」運行（資料儲存在瀏覽器 `localStorage`），可直接測試所有動畫、計時與排行榜功能。

## 啟用跨裝置雲端同步 (Supabase)

1. 前往 [Supabase](https://supabase.com/) 免費建立新專案。
2. 進入專案的 **SQL Editor**，貼上並執行 [`supabase_setup.sql`](./supabase_setup.sql)。
3. 前往 **Project Settings → API**，複製 `Project URL` 與 `anon public` key。
4. 將兩者填入 [`config.js`](./config.js) 的 `SUPABASE_URL` 與 `SUPABASE_ANON_KEY`（或直接在網頁右上角「本地展示模式」按鈕填入測試）。

## 免費部署上線（人人都能開網址參賽）

- **Vercel**：將此資料夾推送到 GitHub 或使用 `npx vercel --prod` 一鍵部署（無需 build 指令，Output Directory 留預設根目錄即可）。
- **GitHub Pages**：將此資料夾推上 GitHub repo，於 `Settings → Pages` 選擇 `main` 分支根目錄即可取得線上網址。
