# STR RVT → IFC 匯出交接

來源：`C:\Users\benhs\OneDrive\文件\三維圖台\references\A18-1\A18A-CO-STR-60_.rvt`
SHA-256：`7b5e3f023db9803b8e3fa90bb64405189abab20bcf4a9c444e24884fce929bb9`
來源格式：Revit 2021。狀態：awaiting_tool。

本工具只核對來源並建立交接包，未開啟 Revit、未產生 IFC。

1. 在具有相容且可用授權 Revit 的電腦執行。將來源複製至獨立工作目錄，複製前後核對雜湊；不將升版或變更存回來源。
2. 開啟副本，核對專業別、樓層、梁／柱／樓板等代表構件、警告及 Manage Links。依 export-job.json 的 links_review 逐項填入判斷；材質資產另外盤點。不可按相似檔名自動重連。
3. 建立專用三維匯出視圖，填入視圖、phase、design option、workset、section box、category visibility、detail level。記錄明確的構件排除項目及預期檢查數量。
4. 先以宿主模型匯出 IFC，核對實際連結匯出選項，避免之後載入各專業時重複。保存 Revit build、IFC exporter 版本、schema/view 與匯出設定。
5. 將來源座標、單位、真北、共同原點、高程基準、控制點及容許誤差填入 placement.json；未知保留 null，禁止猜經緯度或填入未驗證 identity matrix。
6. 在 IFC 檢視工具核對代表構件、單位與包圍盒；將實際 IFC 路徑、雜湊、匯出時間及檢查證據填回 export-job.json。只依已完成證據更新狀態；未測項目維持 not_run。
7. 回傳 IFC、已填紀錄、placement.json 與匯出設定。大型 IFC 存在本專案被忽略的 data/ifc/，不加入 Git，也不送入聊天內容。再執行 convert_ifc.py 接續 GLB 轉換。

如果本機沒有 Revit，可由來源模型提供者執行上述匯出。Python／Rust 本身不能取代原生 RVT 幾何解析。候選執行檔不代表授權或相容性已確認。
