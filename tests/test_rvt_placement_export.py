import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / 'tools' / 'export_rvt_placement.py'
spec = importlib.util.spec_from_file_location('rvt_export',path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PlacementExportTests(unittest.TestCase):
    def test_skill_delivery_scripts_match_tested_tools(self):
        root = Path(__file__).resolve().parents[1]
        for name in ['extract_rvt_georeference.py','verify_rvt_georeference.py','export_rvt_placement.py',
                     'rvt_coordinate_records.py','probe_rvt_coordinates.py']:
            self.assertEqual((root/'tools'/name).read_bytes(),
                             (root/'skills'/'bim-maplibre-preprocess'/'scripts'/name).read_bytes(),name)

    def test_candidate_keeps_rvt_values_and_rejects_mismatched_validation(self):
        matrix = [[1,0,0,100],[0,1,0,200],[0,0,1,3],[0,0,0,1]]
        data = {'input_kind':'RVT','ifc_input':False,'reader':'rvt-rs','reader_version':'0.6.0',
                'source_sha256':'source','crs':None,'tracking':{'active_location_id':1},
                'locations':[{'id':2,'name':'位置二','local_to_shared_m_row_major':matrix}]}
        verification = {'extracted_report_sha256':'report','reference_ifc_sha256':'reference','matched_location_ids':[2]}
        with self.assertRaises(ValueError):
            module.build_candidate(data,verification,'other',2,'EPSG:3826',True)
        with self.assertRaises(ValueError):
            module.build_candidate(data,verification,'report',2,'EPSG:3826')
        with self.assertRaises(ValueError):
            module.build_candidate(data,verification,'report',3,'EPSG:3826',True)
        candidate = module.build_candidate(data,verification,'report',2,'EPSG:3826',True)
        self.assertEqual(candidate['local_to_shared_m_row_major'],matrix)
        self.assertIsNot(candidate['local_to_shared_m_row_major'],matrix)
        self.assertIsNone(candidate['source_crs'])
        self.assertFalse(candidate['geographic_acceptance'])
        self.assertEqual(candidate['source_kind'],'RVT')


if __name__=='__main__':
    unittest.main()
