# 專案狀態

更新日：2026-10-20（Asia/Taipei）。本檔是跨對話接續入口，實際 Git 工作樹與報告為證據來源。

## 目標與判斷
MapLibre GL JS 三維模式展示 RVT 建築與結構。技術路線可行；本批來源是否完整可用尚待 Revit 開啟與小範圍試轉。先 STR 的梁／柱／樓板，再 AR，MEP／LS 後續依需求。

## 階段
| 階段 | 狀態 | 證據／限制 |
|---|---|---|
| RVT 容器與中繼資料盤點 | passed | reports/rvt-inventory-2026-10-20.json；4 檔、SHA-256、Revit 2021、build 與連結狀態；不代表幾何驗證 |
| 原生 Revit 開啟與連結核對 | awaiting_tool | 未發現預設 C:/Program Files/Autodesk 安裝目錄，PATH 無 Revit；尚未完成所有安裝位置搜尋，不能斷言電腦沒有 Revit |
| IFC 匯出 | pending | 無 IFC；需相容 Revit、匯出設定、視圖與連結核對 |
| IFC→GLB | awaiting_tool | PATH 無 IfcConvert；已備轉換腳本，尚無真實 IFC 可測 |
| 屬性對應與座標契約 | pending | CRS、高程、共同原點、真北、控制點未知；不得猜定位 |
| MapLibre 畫面與效能驗收 | pending | 尚無應用程式；無實際畫面、幀率或載入測試 |

## 已完成
- 建立專案 Git main、來源排除規則、前處理 skill、唯讀盤點及基礎轉換腳本。
- 原始檔 4 個合計 1,528,389,632 bytes；所有檔案格式欄位為 2021。
- 建築檔的 STR 連結 `A18A-CO-STR-ALL.rvt` 與現有 `A18A-CO-STR-60_.rvt` 名稱不同，不能自動視為同檔。
- 連結狀態是歷史儲存紀錄；缺失註解表／CAD 不必然造成宿主幾何缺漏，需逐項核對。

## 下一步（按依賴）
1. 取得相容 Revit 的實際可執行環境，或由模型持有人依 skill/references/pipeline.md 提供 STR 的 IFC、匯出設定與座標資訊。先確認構件可見與連結影響。
2. 將 IFC 放主工作區 data/ifc/，使用指定版本 IfcConvert 輸出新的 artifacts/ run 目錄，報告放 reports/。真實轉換通過前，腳本測試不代表轉換器相容。
3. 填入定位契約，抽查代表構件與 IFC GUID；再建最小 MapLibre 展示並設定驗收目標。

## 工作樹與接續
主資料目錄：`C:/Users/benhs/OneDrive/文件/三維圖台/references/A18-1`。
以 `git worktree list` 取得目前工作樹與分支；docs/WORKTREES.md 記錄操作方式。新對話先讀本檔與 DECISIONS，再看 git status、git diff；不要重跑盤點除非來源有變。

## 驗證紀錄
驗證結果見 reports/validation-2026-10-20.md；未執行的原生匯出、真實 IFC 轉換與畫面驗收一律保持 pending。
