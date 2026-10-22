import test from 'node:test';
import assert from 'node:assert/strict';
import {RVT_STR_PLACEMENT} from '../web/rvt-str-placement.js';
import {STR_PLACEMENT_ACCEPTANCE,isStrPlacementAccepted,requireAcceptedStrPlacement} from '../web/str-placement-acceptance.js';

test('project user decision accepts this RVT placement without rewriting extraction evidence',()=>{
  assert.equal(isStrPlacementAccepted(),true);
  assert.doesNotThrow(requireAcceptedStrPlacement);
  assert.equal(STR_PLACEMENT_ACCEPTANCE.acceptance_method,'user_decision');
  assert.equal(STR_PLACEMENT_ACCEPTANCE.survey_validation,false);
  assert.equal(RVT_STR_PLACEMENT.geographic_acceptance,false);
  assert.equal(RVT_STR_PLACEMENT.source_crs,null);
});

test('acceptance cannot carry over to changed source, report, location, CRS or transform',()=>{
  for(const [field,value]of [['source_rvt_sha256','changed'],['extracted_report_sha256','changed'],['selected_location_id',1509],['crs_assumption','EPSG:3825']]){
    assert.equal(isStrPlacementAccepted({...RVT_STR_PLACEMENT,[field]:value}),false,field);
  }
  const changed=structuredClone(RVT_STR_PLACEMENT);
  changed.local_to_shared_m_row_major[2][3]=69.47;
  assert.equal(isStrPlacementAccepted(changed),false);
});
