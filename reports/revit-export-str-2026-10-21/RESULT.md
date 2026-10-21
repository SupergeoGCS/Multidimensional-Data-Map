# STR 原生 IFC／GLB 結果（2026-10-21）

結論：兩份原生 IFC 都已轉成 GLB。候選模型可交由圖台本機匯入，但 **一處樓板開口扣除失敗，未通過正式幾何驗收**；本次未替換站台預設的概略模型。

## 輸入與轉換
| 項目 | 共用座標版 | 內部原點版 |
|---|---|---|
| IFC | data/ifc/revit-str-2026-10-21/A18A-CO-STR-native.ifc | data/ifc/revit-str-2026-10-21/A18A-CO-STR-native-internal.ifc |
| IFC bytes | 28,044,025 | 27,863,437 |
| GLB | artifacts/revit-str-2026-10-21/native-site-local.glb | artifacts/revit-str-2026-10-21/native-internal.glb |
| 耗時 | 約 25.4 秒 | 約 23.5 秒 |
| nodes／meshes | 8,243／8,113 | 8,243／8,113 |
| 容器驗證 | 通過 | 通過 |
| 開口錯誤 | GEO192，同一 GUID | GEO192，同一 GUID |

使用官方 IfcConvert 0.9.0post1+b5e509b，2 threads、--use-element-guids、--site-local-placement；完整命令／來源與輸出 SHA-256 見 native-conversion.json、internal-conversion.json。原始 IFC 保留未修改。內部版建議作為下一個局部視覺檢查候選，不表示正式驗收通過。

## 構件與座標比較
- 兩份 IFC 均為 IFC4，8,536 個 IfcElement GUID 完全相同，沒有只存在其中一份的構件。樓層 16。
- 梁 3,737、柱 1,231、樓板 2,679、牆 355、Proxy 180、Part 125、Opening 229；Opening 是扣除運算元，不能期待各自成為可見 GLB mesh。沒有 IfcStair，不推論 Revit 完全沒有樓梯。
- IFC 長度單位為公分，轉換至公尺倍率 0.01。
- 第一份 header 明確為共用座標、Structural Reference View；第二份 IfcSite placement 為 identity。兩份構件身份一致，但本次尚未完成逐頂點／逐構件的全量幾何等價比較。
- 第一份 IfcSite 大型位移經單位換算為約 (271015.302041, 2768158.337770, -0.85) 公尺，含旋轉。未提供 IfcProjectedCRS／IfcMapConversion；不得自行指定 EPSG。
- IfcSite 經緯度約北緯 42.415、西經 71.258，與目前臺灣專案脈絡不符，疑似樣板殘留；不得拿來放置地圖。此判斷不是正式 CRS 鑑定。
- 使用 --site-local-placement 保持幾何接近局部原點，沒有任意取包圍盒中心。第一份的 site-local Z-up 包圍盒（公尺）：min=(-3.3500,-2.8375,-11.7700)，max=(101.1500,66.3500,36.4000)，尺寸約 104.5×69.19×48.17 公尺。

## 幾何與身份證據
- 第一份 GLB 的 8,243 個幾何 node 名稱皆能對應 IFC GUID；本機 sidecar 在 artifacts/revit-str-2026-10-21/native-elements.jsonl，未將逐構件資料送入對話。
- 第一份統計約 172,172 個三角形（含實例）。Body 外層表示包含 MappedRepresentation 4,963、SweptSolid 3,107、Tessellation 173；MappedRepresentation 本身不是包圍盒近似，不能以它推算保真率。
- 初步「有 representation 卻沒有 GLB node」的 7 個項目已逐項診斷：5 梁只有 Axis，2 Proxy 只有 Annotation／模型線，不是已證實的實體漏轉。詳見 geometry-exceptions.json；不能把初步 missing_represented_counts 當作 7 個實體遺失。
- 梁、柱、樓板、牆各一個樣本，用獨立 IfcOpenShell 0.8.5 幾何與第一份 GLB 的局部包圍盒比較，最大差約 0.0000031 公尺。這只核對少量樣本、單位與座標，不代表全模型視覺／拓樸驗收。
- 開口樣本可解析為運算元；實際被扣除的洞口仍須目視檢查。

## 阻礙與下一步
1. 兩次轉換都記錄 GEO192：`Opening subtraction failed for 1 openings`。樓板 GUID `1wj3$2YBX81ubIDkAMUbiG`，Revit Tag／ElementId **92848**，名稱「樓板:BS1-R20:92848」。樓板有輸出，但其一處開口可能未正確挖空；不能因 exit 0 就忽略錯誤。
2. 下一步只核對此樓板及對應開口：先在 Revit 依元素 ID 定位，確認預期洞口；再以候選 GLB 視覺比較。未授權修改原始模型，不自行修補源幾何。
3. native GLB 尚未在瀏覽器／MapLibre 目視驗證、Khronos glTF Validator 未執行、全量拓樸與效能門檻未驗收；位置契約／測量級地理套合 pending。
4. 使用現有圖台的「載入資料」選擇 native-internal.glb 可先檢視；品質提示會顯示本機匯入未驗證。不要將手動暫放位置寫成真實基地定位。

## 工具與記錄限制
- Python IfcOpenShell 0.8.5 隔離安裝於 artifacts/tools/ifcopenshell-0.8.5；IfcConvert 0.9.0post1 隔離於同 tools 下。
- JSON 診斷日誌在中文字串處不完整；第二次 plain 日誌保留了明確錯誤訊息與 GUID。詳細原始日誌留在 artifacts/。
- 新增 tools/audit_ifc_glb.py，首次實際執行成功，輸出 native-geometry-audit.json 與 sidecar；之後補加 body-only missing 統計欄位未重跑。不得宣稱新版新增欄位已在既有報告出現。
- 原生匯出視圖／phase／類別／屬性集的完整設定快照仍未取得；兩個歷史註解表未完成核對。實際 IFC metadata 與數量為已驗證證據，建議設定不等於已執行。
