# 工作紀錄

## 2026-10-20
- 從只有 references/ 的資料夾建立前處理與狀態管理骨架。
- 以唯讀 CFB parser 盤點四個 RVT，記錄完整 SHA-256、版本與歷史連結狀態。原始檔未修改。
- 建立 bim-maplibre-preprocess skill、Revit 匯出交接規格、IFC→GLB 腳本與品質閘門。
- 端到端仍待 Revit 開啟／匯出、IfcConvert 真實轉檔與地圖驗收；工具可用性與座標資訊尚未確認。
- 五項單元測試與官方 skill 格式檢查通過；已建立 main 基線提交 18cbded（本機快照作者 Codex，不更動使用者全域 Git 身份）。
- skill 已安裝到使用者 skills 目錄；建立並附加受管工作樹，開發分支 codex/bim-preprocess。詳細路徑與接續方式見 WORKTREES.md。
- 擷取四檔內嵌預覽供後續對照；STR 與 AR 目視可見建築群三維畫面，但不據此判定實際幾何完整。
