import copy
import importlib.util
from pathlib import Path
import unittest

path = Path(__file__).resolve().parents[1] / 'tools' / 'verify_rvt_georeference.py'
spec = importlib.util.spec_from_file_location('rvt_validation',path)
validation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validation)


class RvtGeoreferenceValidationTests(unittest.TestCase):
    def test_matching_named_location_does_not_replace_active_or_fill_values(self):
        expected = [[1,0,0,100],[0,1,0,200],[0,0,1,-.85],[0,0,0,1]]
        active = copy.deepcopy(expected);active[2][3]=69.47
        source = {'tracking':{'active_location_id':1},'locations':[
            {'id':1,'name':'有效位置','local_to_shared_m_row_major':active},
            {'id':2,'name':'原始位置','local_to_shared_m_row_major':copy.deepcopy(expected)}]}
        before = copy.deepcopy(source)
        result = validation.compare(source,expected)
        self.assertEqual(source,before)
        self.assertEqual(result['matched_location_ids'],[2])
        self.assertEqual(result['status'],'matched_named_location_active_differs')
        self.assertAlmostEqual(result['locations'][0]['translation_delta_m'][2],70.32)
        self.assertFalse(result['geographic_acceptance'])
        source['locations']=source['locations'][:1]
        self.assertEqual(validation.compare(source,expected)['status'],'no_matching_location')


if __name__=='__main__':
    unittest.main()
