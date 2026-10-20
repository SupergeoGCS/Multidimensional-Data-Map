"""Prepare a local RVT-to-IFC handoff; does not decode geometry or launch Revit."""
import argparse
import json
import os
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from audit_rvt import sha256


def discover_revit(explicit=None):
    candidates = set()
    checks = []
    if explicit:
        candidates.add(Path(explicit).resolve())
    on_path = shutil.which('Revit.exe')
    checks.append({'method': 'PATH', 'found': on_path is not None})
    if on_path:
        candidates.add(Path(on_path))
    roots = {Path(os.environ.get('ProgramFiles', 'C:/Program Files')) / 'Autodesk',
             Path(os.environ.get('ProgramFiles(x86)', 'C:/Program Files (x86)')) / 'Autodesk'}
    for root in sorted(roots):
        try:
            found = list(root.glob('Revit*/Revit.exe')) if root.exists() else []
            candidates.update(found)
            checks.append({'method': 'standard_install_directory', 'path': str(root), 'candidates': len(found)})
        except OSError as error:
            checks.append({'method': 'standard_install_directory', 'path': str(root), 'error': str(error)})
    if sys.platform == 'win32':
        import winreg
        for hive_name in ('HKEY_LOCAL_MACHINE', 'HKEY_CURRENT_USER'):
            for view in (winreg.KEY_WOW64_64KEY, winreg.KEY_WOW64_32KEY):
                try:
                    with winreg.OpenKey(getattr(winreg, hive_name), r'SOFTWARE\Autodesk\Revit', 0,
                                        winreg.KEY_READ | view) as root:
                        for i in range(winreg.QueryInfoKey(root)[0]):
                            name = winreg.EnumKey(root, i)
                            with winreg.OpenKey(root, name) as key:
                                for value_name in ('InstallationLocation', 'InstallLocation'):
                                    try:
                                        location = winreg.QueryValueEx(key, value_name)[0]
                                        if isinstance(location, str) and location:
                                            candidates.add(Path(os.path.expandvars(location)) / 'Revit.exe')
                                    except FileNotFoundError:
                                        pass
                    checks.append({'method': 'revit_registry', 'hive': hive_name, 'view': view, 'status': 'checked'})
                except FileNotFoundError:
                    checks.append({'method': 'revit_registry', 'hive': hive_name, 'view': view, 'status': 'key_absent'})
                except OSError as error:
                    checks.append({'method': 'revit_registry', 'hive': hive_name, 'view': view, 'error': str(error)})
    else:
        checks.append({'method': 'revit_registry', 'status': 'not_windows'})
    valid = []
    for path in sorted(candidates):
        try:
            exists = path.is_file()
            checks.append({'method': 'candidate', 'path': str(path), 'exists': exists})
            if exists:
                valid.append(str(path.resolve()))
        except OSError as error:
            checks.append({'method': 'candidate', 'path': str(path), 'error': str(error)})
    return {'candidates': valid, 'checks': checks,
            'compatibility': 'not_verified', 'license': 'not_verified',
            'limitation': 'Discovery only; custom installations may require --revit-exe. A candidate is not a verified usable installation.'}


def prepare(source, inventory_path, packet, revit_exe=None):
    source, inventory_path, packet = (Path(p).resolve() for p in (source, inventory_path, packet))
    if source.suffix.lower() != '.rvt' or not source.is_file():
        raise ValueError('source must be an existing RVT')
    if packet.exists():
        raise ValueError('packet already exists; use a new run directory')
    inventory = json.loads(inventory_path.read_text(encoding='utf-8'))
    entries = [item for item in inventory['files'] if Path(item['path']).resolve() == source]
    if len(entries) != 1:
        raise ValueError('source must match exactly one inventory entry by absolute path')
    entry = entries[0]
    if entry.get('container_metadata_status') != 'readable' or entry.get('source_stable_during_audit') is not True:
        raise ValueError('inventory entry is not a stable, readable metadata audit')
    before = source.stat()
    digest = sha256(source)
    after = source.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise ValueError('source changed during hashing')
    if digest != entry['sha256'] or after.st_size != entry['bytes']:
        raise ValueError('source differs from inventory; create a new source audit')
    environment = discover_revit(revit_exe)
    status = 'awaiting_tool' if not environment['candidates'] else 'awaiting_native_export'
    links = [{**ref, 'review_result': None, 'resolved_path': None,
              'included_in_export': None, 'review_evidence': None}
             for ref in entry.get('external_references', [])]
    job = {'schema_version': 1, 'created_at_utc': datetime.now(timezone.utc).isoformat(),
           'stage': 'rvt_to_ifc', 'status': status, 'execution_mode': 'native_revit_operator',
           'source': {'path': str(source), 'sha256': digest, 'bytes': after.st_size,
                      'revit_format': entry.get('revit_format'), 'inventory': str(inventory_path)},
           'environment': environment,
           'execution': {'revit_open': 'not_run', 'geometry_export': 'not_run', 'geometry_verified': False},
           'export_record': {'revit_version_build': None, 'ifc_exporter_version': None,
                             'working_copy_path': None, 'working_copy_sha256_before_open': None,
                             'ifc_schema_view': None, 'export_settings_file': None,
                             'view_id_name': None, 'section_box': None, 'phase': None,
                             'design_option': None, 'worksets': None, 'category_visibility': None,
                             'detail_level': None, 'coordinate_base': None,
                             'host_only': True, 'actual_link_export_setting': None,
                             'source_file_untouched_verified': None,
                             'ifc_path': None, 'ifc_sha256': None, 'completed_at_utc': None},
           'native_checks': {'opened_successfully': None, 'discipline_confirmed': None,
                             'warnings_reviewed': None, 'links_reviewed': None,
                             'representative_elements': [], 'units_confirmed': None},
           'links_review': links,
           'acceptance': {'native_open': 'not_run', 'ifc_export': 'not_run',
                          'ifc_geometry_review': 'not_run', 'map_placement': 'not_run'},
           'limitations': ['This packet is not an IFC export.',
                           'Historical link state does not prove current availability.',
                           'Material assets and external server resources require separate native review.']}
    placement = {'schema_version': 1, 'status': 'unknown', 'source_sha256': digest,
                 'source_crs': None, 'source_length_unit': None, 'vertical_datum': None,
                 'internal_origin': None, 'project_base_point': None, 'survey_point': None,
                 'true_north_rotation': None, 'discipline_to_common_matrix': None,
                 'glb_local_to_enu_matrix': None, 'matrix_convention': None,
                 'anchor': {'longitude': None, 'latitude': None, 'height': None},
                 'control_points': [], 'tolerances': None, 'measured_errors': None}
    handoff = f'''# STR RVT → IFC 匯出交接

來源：`{source}`
SHA-256：`{digest}`
來源格式：Revit {entry.get('revit_format')}。狀態：{status}。

本工具只核對來源並建立交接包，未開啟 Revit、未產生 IFC。

1. 在具有相容且可用授權 Revit 的電腦執行。將來源複製至獨立工作目錄，複製前後核對雜湊；不將升版或變更存回來源。
2. 開啟副本，核對專業別、樓層、梁／柱／樓板等代表構件、警告及 Manage Links。依 export-job.json 的 links_review 逐項填入判斷；材質資產另外盤點。不可按相似檔名自動重連。
3. 建立專用三維匯出視圖，填入視圖、phase、design option、workset、section box、category visibility、detail level。記錄明確的構件排除項目及預期檢查數量。
4. 先以宿主模型匯出 IFC，核對實際連結匯出選項，避免之後載入各專業時重複。保存 Revit build、IFC exporter 版本、schema/view 與匯出設定。
5. 將來源座標、單位、真北、共同原點、高程基準、控制點及容許誤差填入 placement.json；未知保留 null，禁止猜經緯度或填入未驗證 identity matrix。
6. 在 IFC 檢視工具核對代表構件、單位與包圍盒；將實際 IFC 路徑、雜湊、匯出時間及檢查證據填回 export-job.json。只依已完成證據更新狀態；未測項目維持 not_run。
7. 回傳 IFC、已填紀錄、placement.json 與匯出設定。大型 IFC 存在本專案被忽略的 data/ifc/，不加入 Git，也不送入聊天內容。再執行 convert_ifc.py 接續 GLB 轉換。

如果本機沒有 Revit，可由來源模型提供者執行上述匯出。Python／Rust 本身不能取代原生 RVT 幾何解析。候選執行檔不代表授權或相容性已確認。
'''
    packet.mkdir(parents=True, exist_ok=False)
    for name, content in (('export-job.json', job), ('placement.json', placement)):
        with (packet / name).open('x', encoding='utf-8') as target:
            json.dump(content, target, ensure_ascii=False, indent=2)
            target.write('\n')
    (packet / 'HANDOFF.md').write_text(handoff, encoding='utf-8')
    return job


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--packet', type=Path, required=True)
    parser.add_argument('--revit-exe', type=Path)
    args = parser.parse_args()
    try:
        job = prepare(args.source, args.inventory, args.packet, args.revit_exe)
    except (ValueError, OSError, KeyError) as error:
        parser.exit(1, f'Preparation failed: {error}\n')
    print(json.dumps({'status': job['status'], 'packet': str(args.packet.resolve()),
                      'source_hash_verified': True, 'geometry_export': 'not_run'}, ensure_ascii=True))
    return 3 if job['status'] == 'awaiting_tool' else 0


if __name__ == '__main__':
    raise SystemExit(main())
