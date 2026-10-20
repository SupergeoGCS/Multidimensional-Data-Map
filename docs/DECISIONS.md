# 決策紀錄

## 2026-10-20：展示與前處理
- 目標平台是 MapLibre GL JS。以 Three.js 自訂三維圖層展示 GLB，RVT 不直接交給瀏覽器解析。
- 第一個概念驗證使用 STR 單專業，再加入 AR；檔名專業別仍待 Revit 核對。先保留局部座標與共同轉換關係，再套地圖，不先猜經緯度。
- Revit→IFC 是有原生工具依賴的階段；IfcConvert 只負責 IFC→GLB。未驗證端到端前不承諾全自動處理 RVT。
- 先幾何展示，再依實際需求實作構件 picking／屬性。轉檔不自動等於完整 BIM 語意保留。
- 模型不得自行上傳雲端；本次只建立本機流程。

## 2026-10-20：跨對話狀態與版本
- 原資料夾初始只有 references，無既有 Git。建立 main 作可追溯基線，獨立工作樹承接前處理開發。
- skill 的版本來源在本 repository 的 skills/；可安裝副本到使用者 skill 目錄。變更先在 repository 修改與驗證，再同步安裝副本，避免兩份漂移。
- references/、data/、artifacts/ 與大型模型格式忽略。工作樹僅保存程式、skill、文件與小型報告；不複製原始 RVT。
- STATE 保存當前進度，WORKLOG 保存完成事件，DECISIONS 保存選擇理由。以 git diff/status 判斷未提交變更，不靠對話回憶。
