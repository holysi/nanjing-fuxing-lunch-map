# 午間漫步｜南京復興午餐地圖

可直接放在 GitHub Pages 的靜態網站。第一階段提供地圖、列表、店家詳細資料、類別／價格／平假日篩選及 Google 地圖步行導航。資料保存在 [`data/places.json`](data/places.json)，不需要資料庫。

## 本機預覽

在專案資料夾執行 `node dev-server.js`，再開啟 `http://127.0.0.1:8000/`。請使用本機伺服器，直接用 `file://` 開啟會使瀏覽器無法讀取 JSON。

## 發布到 GitHub Pages

1. 建立一個 GitHub repository，將本專案所有檔案推送到 `main` 分支。
2. 在 repository 的 **Settings → Pages → Build and deployment**，選擇 **Deploy from a branch**、`main`、`/(root)`，然後儲存。
3. 等待 GitHub 完成發布。網址通常是 `https://<使用者名稱>.github.io/<repository名稱>/`。本專案使用相對路徑，能在專案型 Pages 網址正常載入。

更新 `main` 的檔案後，Pages 會重新發布。這個版本沒有建置步驟，也不需要 API 金鑰。

## 新增或修改店家

編輯 `data/places.json` 的 `places` 陣列。每間店都需有不重複的 `id`、`name`、`category`、`summary`、`description`、`address`、`hours`、`price`、`photos`、`sourceUrl`、`verifiedAt`。`category` 使用 `健康餐`、`日式` 或 `中式`。`hours.weekday`、`hours.weekend` 填入午餐營業時段字串；不知道時填 `null`，該店便不會出現在該營業日的篩選結果。`price` 可填 `{"min": 140, "max": 199, "note": "官網部分餐點定價"}`；不知道時填 `null`。價格篩選依價格範圍是否相交判斷。

照片放在 `images/`，例如 `images/my-lunch.jpg`，並在 `photos` 填入 `["./images/my-lunch.jpg"]`。請使用自己拍攝或取得授權的照片；沒有照片時網站會顯示料理插圖。`coordinates` 採 `[緯度, 經度]` 格式，確認精確位置後將 `coordinatesApproximate` 設為 `false`。目前首批圖釘是示意座標；Google 地圖導航使用地址搜尋。

修改店家資訊時，也請更新 `verifiedAt` 與 `sourceUrl`。營業時間與價格會變動，發布前應向店家再次確認。

## 第二階段規劃

GitHub Pages 只有靜態檔案，無法安全地直接儲存使用者資料或 LINE 密鑰。第二階段需新增後端或雲端服務：LINE Login 驗證、評論文字與照片儲存、投稿待審清單、管理者審核與刊登。審核通過的店家才能進入公開資料；評論與照片須經基本濫用防護。前端目前只顯示「即將開放」，不會假裝已送出資料。

各階段的功能、資料流程與完成標準見 [`ROADMAP.md`](ROADMAP.md)。

## 資料與地圖

首批資訊於 2026-09-13 根據店家或公開頁面整理，來源可在各店詳情開啟。部分營業時間、價格及精確座標尚待實地確認，介面會明確標示。地圖使用 [Leaflet](https://leafletjs.com/) 與 [OpenStreetMap](https://www.openstreetmap.org/copyright) 圖資；顯示地圖需要網路連線。
