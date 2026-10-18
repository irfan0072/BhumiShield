import {api} from '../../api/client';
export type Kind='CIRCULAR'|'FEE'|'OFFICE'|'GUIDE'|'MAP'|'NOTICE'|'LINK';
export interface Details {summary?:string;documents?:string[];steps?:string[];attendance?:string;reference?:string;published_date?:string;effective_date?:string;deadline?:string;service_code?:string;location_id?:number;office_id?:number;health?:string;check_note?:string;}
export interface SourceItem {id:number;kind:Kind;title:string;source_url:string;excerpt?:string;status?:string;version?:number;details:Details;reviewed_at?:string;last_success?:string;freshness?:string;expired?:boolean;review_note?:string;previous?:SourceItem|null;}
export interface SourceMonitor {id:number;source_key:string;kind:Kind;title_bn:string;url:string;enabled:number;interval_hours:number;version:number;last_attempt?:string;last_success?:string;last_error?:string;}
export interface CollectionSettings {enabled:boolean;version:number;updated_by?:string;updated_at?:string;}
export interface SourceContext {services:any[];locations:any[];offices:any[];locations_limit:number;}
export const sourceApi={
 public:(params:Record<string,unknown>={})=>api.get<{items:SourceItem[]}>('/sources/public',{params}).then(r=>r.data.items),
 context:()=>api.get<SourceContext>('/sources/context').then(r=>r.data),
 syncLinks:()=>api.post('/admin/sources/sync-links').then(r=>r.data),
 collectionSettings:(b:{enabled:boolean;version:number;reason:string})=>api.post('/admin/sources/collection-settings',b).then(r=>r.data),
 admin:()=>api.get<{collection:CollectionSettings;collection_history:any[];sources:SourceMonitor[];items:SourceItem[];fees:any[];history:any[]}>('/admin/sources').then(r=>r.data),
 configure:(b:unknown)=>api.post('/admin/sources',b).then(r=>r.data),
 collect:(id:number)=>api.post(`/admin/sources/${id}/collect`,{}, {timeout:45000}).then(r=>r.data),
 decide:(id:number,b:unknown)=>api.post(`/admin/source-reviews/${id}/decision`,b).then(r=>r.data),
 subscriptions:()=>api.get<{location_ids:number[]}>('/sources/subscriptions').then(r=>r.data.location_ids),
 subscribe:(location_id:number,enabled:boolean)=>api.post<{location_ids:number[]}>('/sources/subscriptions',{location_id,enabled}).then(r=>r.data.location_ids),
};
export const sourceError=(e:any)=>e?.response?.data?.message_bn||e?.message||'অনুরোধ সম্পন্ন হয়নি।';
export const kindNames:Record<Kind,[string,string]>={CIRCULAR:['পরিপত্র','Circulars'],FEE:['ফি','Fees'],OFFICE:['অফিস ও চার্টার','Offices & charters'],GUIDE:['কাগজপত্র ও ধাপ','Requirements'],MAP:['ম্যাপ প্রাপ্তি','Map availability'],NOTICE:['প্রকাশ্য নোটিশ','Public notices'],LINK:['সেবার লিংক','Service links']};
