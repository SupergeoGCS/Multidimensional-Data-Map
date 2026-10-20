# 決策紀錄

## 2026-10-20：先建立本機 2D／3D 資料檢視站台
- 使用者希望先檢視資料。採 buildless HTML／ES modules、固定本機 MapLibre／Three.js、標準函式庫 Python HTTP server，避免額外框架與編譯依賴。延續模型不上傳的約束，不使用雲端 Sites 註冊或部署。
- 不猜測模型位置：初始只顯示臺灣地圖；模型可在獨立局部座標視窗檢視，使用者另指定「手動暫放」位置後才加入地圖。2D 隱藏 BIM，自動俯仰／朝北回復；3D 用 custom layer 畫 GLB。
- 支援 GeoJSON／自包含 GLB 的分頁本機匯入，沒有後端上傳；外部 GLB URI 拒絕載入。OpenStreetMap 視野圖磚仍需網路，可切無底圖停止該圖層請求。
- 只提供 web 靜態檔與明確允許的模型／預覽，不提供 references、.git、工作區目錄清單或任意檔案路徑。工作樹透過 --data-root 引用主資料。
- 站台通過互動預覽不等於正式模型幾何與地理套合驗收；原生 IFC 比較仍保留。

## 2026-10-20：rvt-rs 開源替代試驗未達正式替代門檻
- 使用者授權固定版本本機試驗，且「成效良好才更新 skill 替代 Revit 依賴」。下載並隔離使用 Apache-2.0 rvt-rs 0.6.0 的 Python wheel 與官方 Windows CLI；只下載工具，不上傳模型。
- STR 實測成功匯出 8,373 構件／16 樓層的 IFC／GLB，但 5,962 bodies（約 71.2%）為包圍盒。依實測日誌，--saved-meshes 因 Revit 2021 native record framing 未驗證而不讀顯示網格；此變更未改善結果，不再同條件重試。
- `confidence.score=1.0` 與 `--mode geometry` 並不代表完整還原；不能當成正式幾何驗收。178 筆 missing-level 診斷亦不可直接宣稱等同漏失構件。
- 保留概略展示產物，不替代 skill 的正式幾何路線。將來只有在使用者接受近似展示、或工具／來源條件實質改變且重新驗證後才切換；精確幾何仍需合格原生 IFC 或其他已驗證解析器。

## 2026-10-20：原生匯出前置檢查與交接
- 使用者確認目前沒有 Revit。環境檢查亦未找到 PATH、標準安裝或 Revit 登錄候選，因此不嘗試使用 Python 中繼資料 parser 當作幾何轉換器，也不自行上傳模型或安裝大型／付費工具。
- 建立本機 prepare_revit_export.py 產生可交由模型提供者執行的原生匯出包。此次實際執行只核對 STR 來源及環境、建立紀錄；原生開啟／IFC 匯出維持 awaiting_tool。
- placement 未知欄位保留 null；host_only 為交接預期，實際連結匯出設定另留欄位待操作者核對。不把預設值當作完成證據。

## 2026-10-20：大型模型以本機工具處理
- 使用者要求減少 token 與網路資源消耗。預設本機 Python CLI；Rust 僅在量測出效能瓶頸且有實質收益時導入。CPU 密集幾何工作使用既有原生轉換器，不讓 LLM 逐構件處理。
- 模型及完整日誌留在本機；代理只讀 manifest、統計、錯誤摘要與有限預覽。沒有逐模型上傳、遠端轉換或逐構件 LLM 呼叫。
- 現有 SHA-256 每次讀 4 MiB、RVT 循序盤點、GLB BIN 使用 seek 略過、IfcConvert 日誌直接落盤。這些只降低編排與驗證成本，不保證原生轉換器的峰值記憶體。
- 先依狀態與 manifest 避免不必要重跑；未建立自動批次快取／斷點執行器。後續實作時，重用鍵須包含來源雜湊、工具與參數、定位契約；不能只用檔案大小／mtime 判斷內容相同。

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
