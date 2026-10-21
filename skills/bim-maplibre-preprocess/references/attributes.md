# IFC 幾何與屬性配套流程

使用固定版本 IfcConvert 與 IfcOpenShell，本機處理；完整逐構件屬性保存在被忽略的 artifacts/，僅摘要報告加入 Git。

## 完整入口

```text
python scripts/package_ifc.py --ifc <來源.ifc> --glb <新目錄/model.glb> --attributes <新目錄/model.attributes.json> --conversion-report <新轉換報告.json> --report <新配套報告.json> --ifcconvert <IfcConvert.exe> --module-dir <隔離IfcOpenShell目錄> --tool-arg=--site-local-placement
```

`--module-dir` 在環境本來可 import ifcopenshell 時可省略。腳本使用 `--use-element-guids`；其他旗標先核對 converter 的 --help。是否使用 site-local-placement 取決於定位契約，上例不是通用定位修正；保留 IFC placement 與座標證據，不任意中心化。

已有 GLB 時，省略 --ifcconvert，指定已有成功的 --conversion-report；IFC 與 GLB 的內容雜湊都必須符合報告才會重用。屬性與配套報告路徑須為新路徑，拒絕覆寫。新增轉換分支呼叫同目錄 convert_ifc.py；既有轉換的補屬性分支不重算幾何。

## 交付契約

- GLB：幾何 node 名稱保留 IFC GlobalId。
- model.attributes.json：schema_version=1、source_ifc_sha256、glb_sha256、ifc_schema、source_length_to_m、elements 字典（以 GUID 索引）。
- elements 每筆包含 IFC Name／type、Revit Tag（來源未提供則 null，不猜 ElementId）、STEP ID、對應 GLB node 索引、樓層／空間容器、材料名稱，以及來源屬性集與數量集（包含 IfcOpenShell 可讀取的繼承資料）。不是原始 RVT 全部參數的保證。
- 屬性／數量保持 IFC 來源值，未做統一單位換算；source_length_to_m 僅描述 IFC 長度單位，不能套用到所有屬性值。未知／缺值明示未提供。
- 摘要報告：IFC／GLB／屬性檔 SHA-256、工具版本、構件數、GUID 對應數、檔案大小與成功／失敗；不把成功配套標為幾何／定位驗收。

只有 mesh node 逐一能對應來源 GUID 時配套才成功。IFC 中沒有輸出 mesh 的構件仍保留屬性，但 glb_nodes 為空；Opening 等扣除運算元通常不直接渲染，缺 node 不直接推論為漏失實體。

## 圖台接線與驗收

將模型與 attributes JSON 加入明確的本機伺服器 allowlist。資料來源 descriptor 同時指定 url、attributesUrl，更新時兩者一起更換；不可開放任意本機檔案路徑。

瀏覽器取得 GLB 後，計算其 SHA-256，核對屬性檔 glb_sha256；只在一致時以選中 node／祖先 GUID 查詢。缺檔、格式不符或雜湊不同時，保留幾何展示但停用 IFC sidecar，以清楚訊息說明，只呈現 GLB 現有欄位。

實際抽點至少梁／柱／樓板之一，核對中文名稱、IFC type、Revit Tag 與來源 GUID；檢查切換模型後不沿用另一來源屬性。測試雜湊失配拒絕與缺值行為。一般流程不必重匯 RVT；只有 IFC 缺必要資訊時才調整匯出設定。
