import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'skills/bim-maplibre-preprocess/scripts'))
from package_ifc import build_attributes, verify_conversion


class AttributePackageTests(unittest.TestCase):
    def test_stale_or_failed_conversion_cannot_be_reused(self):
        valid = {'status': 'converted_container_checked', 'input_sha256': 'ifc', 'output_sha256': 'glb'}
        verify_conversion(valid, 'ifc', 'glb')
        for record in ({**valid, 'input_sha256': 'old'}, {**valid, 'output_sha256': 'old'},
                       {**valid, 'status': 'failed'}):
            with self.assertRaises(ValueError):
                verify_conversion(record, 'ifc', 'glb')

    def test_real_guid_names_are_required_and_ifc_attributes_retained(self):
        e = SimpleNamespace(GlobalId='guid', Name='混凝土結構柱', Tag='123',
                            is_a=lambda:'IfcColumn', id=lambda:42)
        model = SimpleNamespace(schema='IFC4', by_type=lambda name:[e])
        element_util = SimpleNamespace(get_container=lambda e:None, get_materials=lambda e:[],
                                       get_psets=lambda e:{'Pset_ColumnCommon': {'LoadBearing': True}})
        unit_util = SimpleNamespace(calculate_unit_scale=lambda model:0.01)
        data, count = build_attributes(model, {'nodes':[{'mesh':0,'name':'guid'}]}, 'ifc', 'glb', element_util, unit_util)
        self.assertEqual(count, 1)
        self.assertEqual(data['elements']['guid']['name'], '混凝土結構柱')
        self.assertEqual(data['elements']['guid']['property_sets']['Pset_ColumnCommon']['LoadBearing'], True)
        self.assertEqual(data['source_length_to_m'], .01)
        with self.assertRaises(ValueError):
            build_attributes(model, {'nodes':[{'mesh':0,'name':'not-guid'}]}, 'ifc', 'glb', element_util, unit_util)


if __name__ == '__main__':
    unittest.main()
