import { api } from '../../api/client';
export interface MapLocation { id:number; division_bn:string;division_en:string;district_bn:string;district_en:string;upazila_bn:string;upazila_en:string;mouza_bn:string;mouza_en:string;jl_no:string;latitude:number;longitude:number; }
export interface MapPlot { id:number;location_id:number;plot_code:string;dag_no:string;dag_no_bn:string;total_area_decimal:number;land_type_bn:string;land_type_en:string;owner_sale_locked:number;is_admin_frozen:number;has_active_lien:number; }
export interface MapDataset {id:number;title:string;location_id:number;layer_kind:string;source_url:string;rights_note:string;observed_at:string;sha256:string;feature_count:number;status:string;review_note:string;}
export interface MapWorkspace {locations:MapLocation[];plots:MapPlot[];total:number;page:number;page_size:number;offices:any[];locations_truncated:boolean;}
export const mapApi={
 workspace:(location:number,q:string,page:number,signal?:AbortSignal,areas?:{division:string;district:string;upazila:string})=>api.get<MapWorkspace>('/map/workspace',{params:{location_id:location||undefined,q,page,...areas},signal}).then(r=>r.data),
 layers:(location:number,admin=false)=>api.get<{items:MapDataset[]}>(`${admin?'/admin':''}/map/layers`,{params:{location_id:location||undefined}}).then(r=>r.data.items),
 geometry:(id:number,admin=false)=>api.get(`${admin?'/admin':''}/map/layers/${id}`).then(r=>r.data),
 import:(body:unknown)=>api.post('/admin/map/layers',body).then(r=>r.data),
 review:(id:number,body:unknown)=>api.post(`/admin/map/layers/${id}/review`,body).then(r=>r.data),
};
export const mapError=(e:any)=>e?.response?.data?.code==='PLOT_ALREADY_EXISTS'?'এই দাগের জমির রেকর্ড আছে। নকশায় সেই রেকর্ড যুক্ত করুন; নতুন মালিকানা বরাদ্দের পরিবর্তে প্রয়োজন হলে হস্তান্তর প্রক্রিয়া ব্যবহার করুন।':e?.response?.data?.message_bn||e?.message||'অনুরোধ সম্পন্ন হয়নি। আবার চেষ্টা করুন।';

export interface ParcelDesign {id:number;location_id:number;office_id:number;plot_id:number|null;dag_no:string;survey:string;sheet_no:string;land_use:string;recorded_area:number;geometry:any;area_sqm:number;source_reference:string;status:string;version:number;supersedes_id:number|null;created_by:string;review_note:string;}
export const parcelApi={
 context:()=>api.get('/map-editor/context').then(r=>r.data),
 assign:(body:unknown)=>api.post('/map-editor/assign',body).then(r=>r.data),
 list:(location:number,publicView=false)=>api.get(publicView?'/map/parcel-designs':'/map-editor/parcels',{params:{location_id:location}}).then(r=>r.data.items as ParcelDesign[]),
 save:(body:unknown)=>api.post('/map-editor/parcels',body).then(r=>r.data),
 decide:(id:number,body:unknown)=>api.post(`/map-editor/parcels/${id}/decision`,body).then(r=>r.data),
};

export const allocationApi={
 findOwner:(location:number,nid:string)=>api.post('/map-editor/owners',{location_id:location,nid}).then(r=>r.data),
 list:(location:number)=>api.get('/map-editor/allocations',{params:{location_id:location}}).then(r=>r.data.items),
 create:(id:number,body:unknown)=>api.post(`/map-editor/parcels/${id}/allocate`,body).then(r=>r.data),
 decide:(id:number,body:unknown)=>api.post(`/opening-records/${id}/decision`,body).then(r=>r.data),
 source:(id:number)=>api.get(`/opening-records/${id}/source`,{responseType:'blob'}).then(r=>r.data),
};
