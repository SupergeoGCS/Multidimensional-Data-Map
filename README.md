# RVT 建築結構三維圖台

目標：將 Revit 模型前處理成可定位、可驗證的資產，於 MapLibre GL JS 展示建築與結構。現階段完成來源盤點與流程建置，尚未完成原生模型開啟、轉檔或瀏覽器展示。

- 專案接續入口：[docs/STATE.md](docs/STATE.md)
- 決策與限制：[docs/DECISIONS.md](docs/DECISIONS.md)
- 工作樹與資料操作：[docs/WORKTREES.md](docs/WORKTREES.md)
- 前處理 skill：[SKILL.md](skills/bim-maplibre-preprocess/SKILL.md)
- 來源盤點：[reports/rvt-inventory-2026-10-20.json](reports/rvt-inventory-2026-10-20.json)

本機 Python 可用標準 Python 3.10+；腳本僅使用標準函式庫。skill 格式驗證工具另需 PyYAML。

```powershell
python skills/bim-maplibre-preprocess/scripts/audit_rvt.py --source 'C:\Users\benhs\OneDrive\文件\三維圖台\references\A18-1' --output reports/rvt-inventory-NEW.json
python -m unittest discover -s tests -v
python skills/bim-maplibre-preprocess/scripts/prepare_revit_export.py --source 'C:\Users\benhs\OneDrive\文件\三維圖台\references\A18-1\A18A-CO-STR-60_.rvt' --inventory reports/rvt-inventory-2026-10-20.json --packet reports/revit-export-NEW
```

已執行的 STR 匯出交接包：[HANDOFF.md](reports/revit-export-str-2026-10-20/HANDOFF.md)。準備工具未找到 Revit 時 exit code 3 表示 awaiting_tool，不代表來源損壞，也不代表 IFC 已產生；不要重跑至同一交接目錄。

原始 RVT 保留在主工作區 references/，不納入 Git。工作樹請以絕對路徑存取；產物放各自的 artifacts/。沒有 Revit／IfcConvert 的機器仍可完成唯讀盤點，其他階段保持待驗證。
