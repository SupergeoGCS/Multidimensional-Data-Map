# 工作紀錄

## 2026-10-20：執行 STR 原生匯出準備
- 使用者要求建立並執行下一階段，並確認目前沒有 Revit。
- 先查 Windows 安裝清單、執行程序、常見路徑、Revit 登錄項目與 PATH，未找到可用候選；新增可重現的 prepare_revit_export.py（PATH／標準目錄／Revit 登錄／明確指定路徑）。
- 實際對 A18A-CO-STR-60_.rvt 重算雜湊，核對既有盤點一致；生成 reports/revit-export-str-2026-10-20 的 export-job.json、placement.json、HANDOFF.md。待核對外部參照 12 筆。結果 awaiting_tool，原生幾何匯出未執行。
- 7 項單元測試通過，包含來源變更拒絕、交接包覆寫拒絕、缺工具時不宣稱匯出及未知座標保留；官方 skill 格式驗證通過。原始 RVT 未修改，無模型上傳、無新套件下載。

## 2026-10-20：本機處理與資源使用原則
- 依使用者建議，將本機 Python CLI、按瓶頸評估 Rust、摘要進對話及階段結果重用原則加入 skill 與專案規則。
- 檢查現有腳本：來源雜湊區塊讀取、循序盤點、GLB BIN seek 與轉換日誌落盤已具備；未宣稱原生轉換器具有固定記憶體，也未宣稱自動快取已實作。
- 本次僅調整流程文件，未重跑大型 RVT、未下載依賴或上傳模型。

## 2026-10-20
- 從只有 references/ 的資料夾建立前處理與狀態管理骨架。
- 以唯讀 CFB parser 盤點四個 RVT，記錄完整 SHA-256、版本與歷史連結狀態。原始檔未修改。
- 建立 bim-maplibre-preprocess skill、Revit 匯出交接規格、IFC→GLB 腳本與品質閘門。
- 端到端仍待 Revit 開啟／匯出、IfcConvert 真實轉檔與地圖驗收；工具可用性與座標資訊尚未確認。
- 五項單元測試與官方 skill 格式檢查通過；已建立 main 基線提交 18cbded（本機快照作者 Codex，不更動使用者全域 Git 身份）。
- skill 已安裝到使用者 skills 目錄；建立並附加受管工作樹，開發分支 codex/bim-preprocess。詳細路徑與接續方式見 WORKTREES.md。
- 擷取四檔內嵌預覽供後續對照；STR 與 AR 目視可見建築群三維畫面，但不據此判定實際幾何完整。
