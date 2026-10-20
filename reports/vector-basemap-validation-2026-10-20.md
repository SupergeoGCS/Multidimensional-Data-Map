# 向量底圖整合驗證

日期：2026-10-20。MapLibre GL JS 5.6.0；Liberty 樣式來自 https://tiles.openfreemap.org/styles/liberty，快照與來源雜湊保存在 web/map-styles/。

| 項目 | 結果 |
|---|---|
| 本機樣式快照與實際向量圖磚／字形／圖示 | 瀏覽器成功載入；臺灣全景及街區尺度可見 |
| 周邊立體建物 | 向量＋3D＋縮放18可見；可單獨關閉與重新開啟 |
| 獨立 BIM | 模型與周邊建物同時可見；BIM 關閉而周邊建物保留，控制互不相依 |
| 既有資料保留 | 匯入示意 sample.geojson、手動暫放 BIM；切換 vector→street→none→vector 後圖層清單、暫放經緯度、BIM 保留，未重建 style |
| attribution | 向量模式顯示 OpenFreeMap／OpenMapTiles／OSM；點陣模式顯示 OSM |
| 無底圖 | 底圖消失而 BIM 保留，周邊建物控制停用 |
| Node 回歸測試 | 3 項通過：來源命名空間與平面建物、跨模式保留獨立資料、向量樣式缺失時的點陣／無底圖退路 |
| 原有 Python 測試 | 10 項通過 |
| JS 語法與 console | 語法通過；已測瀏覽器流程無觀測到 error／warn |

測試暫放座標 121.5654／25.0330 僅為操作驗證，不是模型真實位置。未驗證 OSM 建物高度準確度、資料覆蓋率、測量級定位與大資料效能；沒有加入 DEM。周邊建物與 STR 均不得用作精確量測。

開關只控制底圖 layers，BIM custom layer 與本機 GeoJSON 不在底圖控制清單。沒有模型上傳，也沒有預抓或批次下載圖磚。公開服務可能中斷，因此保留三種底圖選項。
