---
name: bim-maplibre-preprocess
description: Audit Revit RVT sources and prepare georeferenced IFC and GLB assets for MapLibre GL JS, including export handoff, conversion logs, element identity, and visual acceptance. Use for BIM preprocessing and resuming this pipeline; does not edit native Revit geometry.
---

# BIM → MapLibre 前處理

目標是可重現、可追溯、定位正確的三維資產。區分「容器可讀」、「Revit 可開啟」、「幾何已轉換」、「地圖已驗收」；任何一項不得推論其他項已通過。

## 接續與來源
在專案先讀 AGENTS.md、docs/STATE.md、docs/DECISIONS.md，查看 Git 狀態與工作樹。若其他專案沒有這些文件，建立同用途紀錄並填入實際狀態。所有腳本路徑相對本 skill。

1. 執行 `python scripts/audit_rvt.py --source <RVT資料夾> --output <盤點.json>`。腳本唯讀解析 CFB 的 BasicFileInfo 與 TransmissionData，記錄 SHA-256、大小、版本、原始連結。連結狀態是上次儲存的紀錄；不能當成目前可用性證明。容器解析失敗不等於模型無法由 Revit 修復；保留錯誤並交給相容工具診斷。
2. 版本、外部連結、Revit／轉換器可用性不明時先盤點。不要憑 `-60_` 等檔名推斷樓層或內容。不要把同專業但不同檔名的 RVT 自動替換連結。

## 匯出與轉換
讀 [references/pipeline.md](references/pipeline.md) 的 Revit 匯出、座標與屬性規則。RVT 需要相容 Revit 或已驗證的合法解析工具；IfcConvert 不讀 RVT。沒有這類工具時完成盤點和匯出交接，將匯出階段標記 awaiting_tool，不得宣稱完成自動轉檔。不要為此自行上傳私有模型至雲端。

優先以 STR 單檔驗證，再加 AR；專業別只是檔名推測，須以實際開啟結果確認。Revit 在副本匯出可見三維模型為 IFC，保存版本、視圖、匯出設定、連結處理與座標證據。

使用 `python scripts/convert_ifc.py --input <model.ifc> --output <新目錄/model.glb> --ifcconvert <執行檔> --report <轉換紀錄.json>`。此腳本僅執行基礎 IFC→GLB，驗證 GLB 容器／JSON；不自動修正座標、不抽取完整屬性、不代表視覺驗收。失敗保留日誌並記錄原因；產物路徑不可覆寫。確認所用版本的 `IfcConvert --help` 後再選額外旗標，不假設所有版本支援相同選項。

## 品質閘門
依 pipeline.md 完成構件與屬性、座標、材質、效能、MapLibre 驗收。未通過或未執行的閘門明確標記。GLB 未保留的 BIM 語意另做 sidecar，至少保留來源雜湊與唯一構件識別；幾何節點無法對應 IFC GUID 時不能宣稱可查詢構件屬性。

在 docs/STATE.md 記錄階段（pending / awaiting_tool / in_progress / passed / failed）、證據檔、工具版本、阻礙、下一個可執行動作。追加工作紀錄。原始檔與大型產物不加入 Git；報告不得包含密碼、token，外部分享前檢查原始路徑等專案資訊。
