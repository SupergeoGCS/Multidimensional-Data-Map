# 專案狀態

更新日：2026-10-20（Asia/Taipei）。本檔是跨對話接續入口，實際 Git 工作樹與報告為證據來源。

## 目標與判斷
MapLibre GL JS 三維模式展示 RVT 建築與結構。技術路線可行；本批來源是否完整可用尚待 Revit 開啟與小範圍試轉。先 STR 的梁／柱／樓板，再 AR，MEP／LS 後續依需求。

## 階段
| 階段 | 狀態 | 證據／限制 |
|---|---|---|
| RVT 容器與中繼資料盤點 | passed | reports/rvt-inventory-2026-10-20.json；4 檔、SHA-256、Revit 2021、build 與連結狀態；不代表幾何驗證 |
| 原生 Revit 開啟與連結核對 | awaiting_tool | 使用者確認目前沒有 Revit；已執行 PATH、標準安裝目錄、HKLM/HKCU 32/64 位元 Revit 登錄項目檢查，未找到候選工具；見 reports/revit-export-str-2026-10-20/export-job.json |
| IFC 匯出 | awaiting_tool | STR 匯出交接包已建立並執行準備，來源雜湊一致、12 筆歷史外部參照待核對；尚無原生開啟、幾何匯出或 IFC |
| IFC→GLB | awaiting_tool | PATH 無 IfcConvert；已備轉換腳本，尚無真實 IFC 可測 |
| 屬性對應與座標契約 | pending | CRS、高程、共同原點、真北、控制點未知；不得猜定位 |
| MapLibre 畫面與效能驗收 | pending | 尚無應用程式；無實際畫面、幀率或載入測試 |

## 已完成
- 新增 prepare_revit_export.py 並對 STR 真實來源執行：只重算此檔 SHA-256、核對既有盤點、環境檢查、產生 export-job.json／placement.json／HANDOFF.md；無工具時明確回報 awaiting_tool。交接包不代表已匯出 IFC。
- 已確立本機 Python CLI 優先、Rust 依效能量測評估的原則，寫入 AGENTS／skill／DECISIONS。大型資料不上傳對話；沿用既有報告避免重複掃描。本次未重跑 RVT，也未新增自動快取／斷點工具。
- 建立專案 Git main、來源排除規則、前處理 skill、唯讀盤點及基礎轉換腳本。
- 原始檔 4 個合計 1,528,389,632 bytes；所有檔案格式欄位為 2021。
- 建築檔的 STR 連結 `A18A-CO-STR-ALL.rvt` 與現有 `A18A-CO-STR-60_.rvt` 名稱不同，不能自動視為同檔。
- 連結狀態是歷史儲存紀錄；缺失註解表／CAD 不必然造成宿主幾何缺漏，需逐項核對。
- 已擷取四檔內嵌 PNG 預覽至 reports/previews/；目視 STR 與 AR 可見建築群三維畫面。這只是儲存時快取，非本次重新產生的幾何或完整性證明。

## 下一步（按依賴）
1. 本機目前無 Revit；由模型持有人使用 reports/revit-export-str-2026-10-20/HANDOFF.md 執行原生匯出，或未來取得相容且可用授權的 Revit 後接續。需回傳 STR IFC、填妥 export-job.json、placement.json 及匯出設定；先確認構件可見與連結影響。不得僅因交接包存在就直接進入已通過的 IFC 階段。
2. 將 IFC 放主工作區 data/ifc/，使用指定版本 IfcConvert 輸出新的 artifacts/ run 目錄，報告放 reports/。真實轉換通過前，腳本測試不代表轉換器相容。
3. 填入定位契約，抽查代表構件與 IFC GUID；再建最小 MapLibre 展示並設定驗收目標。

## 工作樹與接續
主資料目錄：`C:/Users/benhs/OneDrive/文件/三維圖台/references/A18-1`。
開發工作樹：`C:/Users/benhs/.codex/worktrees/bim-preprocess/三維圖台`，分支 `codex/bim-preprocess`，已附加於本聊天；主工作區維持 main。
使用者 skill 已安裝於 `C:/Users/benhs/.codex/skills/bim-maplibre-preprocess`，repository 的 skills/ 是版本來源。新對話可用 `$bim-maplibre-preprocess`；是否立即出現在目前對話的 skill 清單取決於 app 重新載入，亦可直接讀專案內 SKILL.md。
以 `git worktree list` 取得目前工作樹與分支；docs/WORKTREES.md 記錄操作方式。新對話先讀本檔與 DECISIONS，再看 git status、git diff；不要重跑盤點除非來源有變。

## 驗證紀錄
驗證結果見 reports/validation-2026-10-20.md；未執行的原生匯出、真實 IFC 轉換與畫面驗收一律保持 pending。
本次新增準備工具後，7 項單元測試與 skill 格式檢查通過。匯出準備的成功僅證明來源核對及交接建立，不代表原生幾何匯出。
