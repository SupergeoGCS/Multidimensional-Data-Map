# 原生 Revit 接續（2026-10-21）

- 使用者已安裝 Revit；本機確認 `C:/Program Files/Autodesk/Revit 2027/Revit.exe`，FileVersion `27.3.0.28`，ProductVersion `20260907_1515(x64)`。
- AddIns/IFCExporterUI 包含 Autodesk.IFC.Export.UI.dll 與 Upgrader，版本 27.3.0.28；僅確認元件存在，尚非 IFC 匯出成功。
- GUI 已啟動，標題顯示 2027.3 試用版（非商用），試用提示顯示剩餘 30 天；未操作登入或付款。
- 重新執行 prepare_revit_export.py，STR 來源 SHA-256 與 2026-10-20 盤點一致。
- 建立隔離副本 `artifacts/revit-str-2026-10-21/A18A-CO-STR-60_.rvt`，複製後 SHA-256 與來源一致：`7b5e3f023db9803b8e3fa90bb64405189abab20bcf4a9c444e24884fce929bb9`。
- GUI 開啟上述副本，經模型升級 Revit 2021 → 2027，已進入 STR 的 3D 視圖 {3D} 初始化，但模型尚未畫出、視窗暫時沒有回應；不將此視為開啟驗收通過。尚未儲存，也未執行 IFC 匯出。
- 升版出現 0 個錯誤、22 個警告，已匯出 upgrade-warnings.html（5,133 bytes）：包含元素包覆與草圖線稍微偏離軸。未操作取消接合或刪除元素，保留警告繼續載入。
- 分析模型升級提示部分分析元素標註／明細表／視圖可能修改或遺失，另有 20 筆警告的通知，其中可見分析元素無效訊息；尚未逐一核對，不將這些分析模型警告推論為實體幾何漏失。
- journal.0001.txt（原生日誌留在使用者 Revit Journals）持續新增，CPU 累計從 574 到 842 秒，非單憑 UI 進度停留就宣稱死當。13:05:57 日誌有 SQLLocalDB instance is malfunctioning、steel functionalities 可能 crash 的警告；IFC 匯出影響未驗證，須先診斷原生環境再驗收。
- 本次啟動多出一個未開檔實例（PID 41116）；載入副本的是既有 PID 19532。Windows 工具對兩視窗的畫面區分不可靠，因此沒有執行關閉或強制終止，避免中斷模型載入。
- Windows UI accessibility 不穩定：原生檔名欄 set_value 回報 Cannot set a value for an element that is not settable；改由畫面確認游標後輸入副本完整路徑，成功進入模型升級。不得重複 set_value。
- 下一步：確認既有 STR 視窗完成初始化；若仍不回應，以該日誌與程序 CPU 是否推進判斷，勿重複開檔。核對 SQLLocalDB 警告影響、外部參照與 3D 視圖，再記錄宿主 IFC 匯出設定；來源 references 不回存。
