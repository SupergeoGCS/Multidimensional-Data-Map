import {RVT_STR_PLACEMENT} from './rvt-str-placement.js';

// Project acceptance is separate from the immutable extraction evidence.
export const STR_PLACEMENT_ACCEPTANCE=Object.freeze({
  accepted_on:'2026-10-22',
  acceptance_method:'user_decision',
  geographic_acceptance:true,
  survey_validation:false,
  vertical_datum:null,
  source_rvt_sha256:'7b5e3f023db9803b8e3fa90bb64405189abab20bcf4a9c444e24884fce929bb9',
  extracted_report_sha256:'858865590f15aec6fbba8923916442b2f531f8ba4c90c411b5d3b5a65eaeb585',
  selected_location_id:233312,
  adopted_crs:'EPSG:3826',
  matrix_json:'[[0.7509343566077378,-0.6603768560951563,0,271015.30204113544],[0.6603768560951563,0.7509343566077378,0,2768158.33777001],[0,0,0.9999999999999997,-0.8499999999999971],[0,0,0,1]]',
});

export function isStrPlacementAccepted(placement=RVT_STR_PLACEMENT){
  const a=STR_PLACEMENT_ACCEPTANCE;
  return placement.source_rvt_sha256===a.source_rvt_sha256
    &&placement.extracted_report_sha256===a.extracted_report_sha256
    &&placement.selected_location_id===a.selected_location_id
    &&placement.crs_assumption===a.adopted_crs
    &&JSON.stringify(placement.local_to_shared_m_row_major)===a.matrix_json;
}

export function requireAcceptedStrPlacement(){
  if(!isStrPlacementAccepted())throw new Error('STR 定位資料已變更，需重新確認專案採用位置。');
}
