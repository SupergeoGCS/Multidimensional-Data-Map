# rvt-rs 0.6.0：STR 本機試驗

日期：2026-10-20。來源：A18A-CO-STR-60_.rvt（Revit 2021，120,655,872 bytes）。

## 判定
成功輸出 IFC 與 GLB，可做概略三維展示；**尚不足以替代正式 RVT 幾何匯出**，本次不更換 skill 的正式流程。這不是整個 rvt-rs 專案無效的結論，只是此版本與此來源尚未通過本專案的幾何驗證。

| 項目 | 結果 |
|---|---|
| 匯出建築構件 | 8,373 |
| 分類 | 梁 3,737、柱 1,231、樓板 2,659、牆 357、基礎 20、Proxy 369 |
| 樓層 | 16 |
| 包圍盒近似 | 5,962，約 71.2% |
| 其他 body source | column_cut 2,056；join_trimmed 355；這些標籤也不代表已獨立驗證精確 |
| 缺少樓層關聯診斷 | 178；不直接解讀為遺失 178 個構件，須另查其實際匯出與定位 |
| 警告 | 6，含 Revit 2021 幾何／參數限制與 walker 資源上限 |
| IFC | 28,699,029 bytes；約 17.29 秒 |
| GLB | 5,268,112 bytes；約 8.52 秒；8,374 nodes、8,373 meshes、100,476 triangles |
| 基本 GLB 結構檢查 | 通過；完整 Khronos validation、瀏覽器及 MapLibre 驗收未執行 |

CLI 與 Python bindings 固定為 0.6.0。Python wheel 約 2.6 MB，官方 Windows CLI 壓縮包約 22.3 MB；只擷取所需二進位。CLI 壓縮包 SHA-256 已與官方 GitHub release digest 核對一致；詳見 evaluation.json。所有模型處理在本機，沒有上傳 RVT。

## 兩種條件的實測
1. Python `RevitFile.export_diagnostics_json()`：5,962 個 bounding-box bodies。
2. 官方 CLI 加 `--saved-meshes`：仍為 5,962。IFC 與 GLB 日誌均明確回報 `saved graphics not read, bodies unchanged: native record framing is unvalidated for Revit 2021`。不是反覆重試相同參數；此選項是針對包圍盒近似提出的第二個假設，實測未改善，因此停止此方向。

工具 confidence score=1.00／level=geometry 僅代表其定義的就緒程度，**不能解讀為 100% 還原、完整度或幾何正確率**。source_coverage 亦是工具內部計數比例，沒有可比較的原生 IFC，不能用來宣稱母體構件完整度。

## 可重現命令
以下路徑相對主工作區；重跑時另選新的產物目錄，不覆寫本次證據。

```powershell
artifacts/tools/rvt-rs/bin/rvt-ifc.exe references/A18-1/A18A-CO-STR-60_.rvt -o artifacts/NEW/str.ifc --mode geometry --saved-meshes --diagnostics artifacts/NEW/diagnostics.json
artifacts/tools/rvt-rs/bin/rvt-gltf.exe references/A18-1/A18A-CO-STR-60_.rvt -o artifacts/NEW/str-preview-only.glb --saved-meshes --verbose
```

`--mode geometry` 只要求至少一個含幾何的構件，不是本專案的正式驗收閘門。不要為了通過而忽略包圍盒與警告，也不要把預覽檔當成已通過地圖定位的資產。

## 產物與限制
- 小型證據保存在此資料夾：evaluation.json、兩組 diagnostics、文字日誌、glb-scene-summary.json 及 preview.png。
- 大型產物在主工作區 `artifacts/rvt-rs-str-0.6.0/`，不納入 Git，不會自動出現在其他工作樹。evaluation.json 保存絕對路徑、來源與產物雜湊、工具雜湊及實際命令。
- preview.png 使用本機 NumPy／Pillow 對 GLB triangles 作等角正交 painter 排序繪製，已套用 GLB root matrix（英尺→公尺與軸轉換）。它可有遮擋排序瑕疵，僅供檢視恢復出的整體結構，不能當成瀏覽器或 MapLibre 驗收。
- 原始來源 SHA-256 與原盤點一致。尚未檢查實際地理座標、視圖／phase 過濾、外部連結、構件完整度與精確外型。

## 後續路線
正式幾何仍向模型提供者取得原生 IFC，或使用其他已驗證的 RVT 解析工具。若使用者接受包圍盒近似的「概略展示」，可將目前 GLB 作為獨立 preview-only 分支的輸入；必須保留近似比例及未驗證標示，不能藉此把正式幾何階段改成 passed。

官方來源：https://github.com/DrunkOnJava/rvt-rs （v0.6.0，Apache-2.0）。本次實測結果優先於 README 的通用支援宣稱。
