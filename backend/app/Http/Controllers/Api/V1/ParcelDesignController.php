<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api\V1;
use App\Support\DB;
use App\Http\Middleware\RoleMiddleware;
use App\Services\ParcelGeometry as G;
use Database\Seeders\DatabaseSeeder;
final class ParcelDesignController {
 private const ROLES=['admin','system_admin','ac_land','land_office_assistant','field_verification_officer','settlement_records_officer','settlement_checker'];
 private static function fail(string $code,string $message,int $status=422):never{throw new \RuntimeException(json_encode(['status'=>$status,'code'=>$code,'message_bn'=>$message,'message_en'=>$message],JSON_UNESCAPED_UNICODE));}
 private static function admin(array $u):bool{return in_array($u['role'],['admin','system_admin'],true);}
 public static function migrate():void {
  $id=DB::isPostgres()?'BIGSERIAL PRIMARY KEY':'INTEGER PRIMARY KEY AUTOINCREMENT';
  DB::statement('CREATE TABLE IF NOT EXISTS map_mouza_offices (location_id INTEGER PRIMARY KEY REFERENCES locations(id),office_id INTEGER NOT NULL REFERENCES offices(id),assigned_by TEXT NOT NULL,reason TEXT NOT NULL,updated_at TEXT NOT NULL)');
  DB::statement("CREATE TABLE IF NOT EXISTS map_parcel_designs (id {$id},location_id INTEGER NOT NULL REFERENCES locations(id),office_id INTEGER NOT NULL REFERENCES offices(id),plot_id INTEGER REFERENCES plots(id),dag_no TEXT NOT NULL,survey TEXT NOT NULL,sheet_no TEXT NOT NULL,land_use TEXT NOT NULL,recorded_area REAL NOT NULL,geometry TEXT NOT NULL,area_sqm REAL NOT NULL,xmin REAL NOT NULL,ymin REAL NOT NULL,xmax REAL NOT NULL,ymax REAL NOT NULL,source_reference TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'DRAFT',version INTEGER NOT NULL DEFAULT 1,supersedes_id INTEGER REFERENCES map_parcel_designs(id),created_by TEXT NOT NULL,reviewed_by TEXT,review_note TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)");
  DB::statement('CREATE TABLE IF NOT EXISTS map_parcel_owner_requests (design_id INTEGER PRIMARY KEY REFERENCES map_parcel_designs(id),batch_id INTEGER NOT NULL UNIQUE REFERENCES onboarding_batches(id))');
  DB::statement('CREATE INDEX IF NOT EXISTS map_parcel_location_status ON map_parcel_designs(location_id,status,xmin,xmax)');
 }
 private static function user(?array $actor):array{return RoleMiddleware::authorize(self::ROLES,$actor);}
 private static function allowed(array $u,int $loc,int $office):bool {
  if(self::admin($u))return true;
  return (bool)DB::selectOne('SELECT o.id FROM map_mouza_offices m JOIN offices o ON o.id=m.office_id JOIN office_user ou ON ou.office_id=o.id WHERE m.location_id=? AND m.office_id=? AND ou.user_id=? AND o.is_active=1',[$loc,$office,$u['id']]);
 }
 private static function aclScope(array $u,int $loc):bool {
  if($u['role']!=='ac_land')return false;
  return (bool)DB::selectOne("SELECT o.id FROM offices o JOIN office_user ou ON ou.office_id=o.id JOIN locations l ON l.district_en=o.district_en AND l.upazila_en=o.upazila_en WHERE ou.user_id=? AND o.is_active=1 AND o.office_type='ac_land' AND l.id=?",[$u['id'],$loc]);
 }
 private static function scope(array $u,int $loc,int $office):void {
  $a=DB::selectOne('SELECT m.office_id FROM map_mouza_offices m JOIN offices o ON o.id=m.office_id WHERE m.location_id=? AND o.is_active=1',[$loc]);
  if(!$a||(int)$a['office_id']!==$office||!self::allowed($u,$loc,$office))self::fail('MAP_OFFICE_SCOPE','এই মৌজার জন্য সক্রিয় দায়িত্বপ্রাপ্ত অফিস ও আপনার দাপ্তরিক নিয়োগ মিলছে না।',403);
 }
 private static function audit(array $u,string $action,string $id,array $detail):void {DatabaseSeeder::appendAuditEntry($u['username'],$u['role'],$action,'parcel_design',$id,$detail,gmdate('c'));}
 public static function context(?array $actor=null):array {
  $u=self::user($actor);self::migrate();
  $locations=DB::select('SELECT l.*,m.office_id,o.name_bn AS office_name_bn FROM locations l LEFT JOIN map_mouza_offices m ON m.location_id=l.id LEFT JOIN offices o ON o.id=m.office_id ORDER BY l.district_bn,l.upazila_bn,l.mouza_bn');
  foreach($locations as &$l)$l['can_edit']=self::admin($u)||($l['office_id']&&self::allowed($u,(int)$l['id'],(int)$l['office_id']));unset($l);
  if(!self::admin($u))$locations=array_values(array_filter($locations,fn($l)=>$l['can_edit']||self::aclScope($u,(int)$l['id'])));
  $offices=DB::select("SELECT id,name_bn,name_en,office_type,district_en,upazila_en,is_active FROM offices WHERE is_active=1 AND office_type IN ('ac_land','settlement','land_office','admin_cell') ORDER BY name_bn");
  return ['locations'=>$locations,'offices'=>self::admin($u)?$offices:[],'is_admin'=>self::admin($u),'can_allocate'=>in_array($u['role'],['admin','system_admin','land_office_assistant','settlement_records_officer'],true),'can_allocate_review'=>$u['role']==='ac_land','can_review'=>in_array($u['role'],['admin','system_admin','ac_land','settlement_checker'],true)];
 }
 public static function assign(array $b,?array $actor=null):array {
  $u=RoleMiddleware::authorize(['admin','system_admin'],$actor);self::migrate();$loc=(int)($b['location_id']??0);$office=(int)($b['office_id']??0);$reason=trim((string)($b['reason']??''));
  $l=DB::selectOne('SELECT * FROM locations WHERE id=?',[$loc]);$o=DB::selectOne("SELECT * FROM offices WHERE id=? AND is_active=1 AND office_type IN ('ac_land','settlement','land_office','admin_cell')",[$office]);
  if(!$l||!$o||mb_strlen($reason)<12)self::fail('ASSIGNMENT_REQUIRED','মৌজা, ভূমি/জরিপ অফিস এবং বরাদ্দের বিস্তারিত কারণ দিন।');
  if(strcasecmp($l['district_en'],$o['district_en'])!==0||(!in_array($o['office_type'],['settlement','admin_cell'],true)&&strcasecmp($l['upazila_en'],$o['upazila_en'])!==0))self::fail('OFFICE_AREA_MISMATCH','অফিস ও মৌজার জেলা/উপজেলা মেলেনি।');
  return DB::transaction(static function()use($u,$loc,$office,$reason){
   $old=DB::selectOne('SELECT office_id FROM map_mouza_offices WHERE location_id=?',[$loc]);
   DB::statement('INSERT INTO map_mouza_offices(location_id,office_id,assigned_by,reason,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(location_id) DO UPDATE SET office_id=excluded.office_id,assigned_by=excluded.assigned_by,reason=excluded.reason,updated_at=excluded.updated_at',[$loc,$office,$u['username'],$reason,gmdate('c')]);
   // Move the work queue to the newly responsible office, preserving design history.
   DB::statement('UPDATE map_parcel_designs SET office_id=?,version=version+1,updated_at=? WHERE location_id=?',[$office,gmdate('c'),$loc]);
   self::audit($u,'MAP_MOUZA_ASSIGNED',(string)$loc,['old_office_id'=>$old['office_id']??null,'office_id'=>$office,'reason'=>$reason]);return ['office_id'=>$office,'location_id'=>$loc];
  });
 }
 public static function items(array $q,bool $public=false,?array $actor=null):array {
  self::migrate();$loc=(int)($q['location_id']??0);if(!$loc)return ['items'=>[]];$u=$public?null:self::user($actor);
  $rows=DB::select('SELECT * FROM map_parcel_designs WHERE location_id=?'.($public?" AND status='PUBLISHED'":'').' ORDER BY id DESC LIMIT 501',[$loc]);
  if(!$public)$rows=array_values(array_filter($rows,fn($r)=>self::allowed($u,(int)$r['location_id'],(int)$r['office_id'])));
  if(count($rows)>500)self::fail('NARROW_MAP_SCOPE','এই মৌজায় অনেক দাগ আছে; মানচিত্রের আলাদা spatial service প্রয়োজন।');
  foreach($rows as &$r){$r['geometry']=json_decode($r['geometry'],true);if($public)foreach(['created_by','reviewed_by','review_note'] as $key)unset($r[$key]);}unset($r);
  return ['items'=>$rows];
 }
 private static function collision(array $r,array $g,int $exclude=0,int $supersedes=0):void {
  $box=$g['bbox'];$rows=DB::select("SELECT id,dag_no,geometry FROM map_parcel_designs WHERE location_id=? AND survey=? AND status IN ('SUBMITTED','PUBLISHED') AND id<>? AND id<>? AND xmin<=? AND xmax>=? AND ymin<=? AND ymax>=? LIMIT 501",[$r['location_id'],$r['survey'],$exclude,$supersedes,$box[2],$box[0],$box[3],$box[1]]);
  if(count($rows)>500)self::fail('SPATIAL_REVIEW_REQUIRED','এখানে অত্যধিক সীমানা আছে; বিস্তারিত GIS পরীক্ষা প্রয়োজন।');
  foreach($rows as $other)if(G::overlaps($g['geometry'],json_decode($other['geometry'],true)))self::fail('PARCEL_OVERLAP','সীমানা দাগ '.$other['dag_no'].'-এর সঙ্গে মিলে যাচ্ছে। সীমানা সরিয়ে ঠিক করুন।',409);
 }
 public static function save(array $b,?array $actor=null):array {
  $u=self::user($actor);self::migrate();$id=(int)($b['id']??0);$loc=(int)($b['location_id']??0);$office=(int)($b['office_id']??0);self::scope($u,$loc,$office);
  $r=['location_id'=>$loc,'office_id'=>$office];foreach(['dag_no','survey','sheet_no','land_use','source_reference'] as $key){$r[$key]=trim((string)($b[$key]??''));if($r[$key]===''||mb_strlen($r[$key])>500)self::fail('DESIGN_DETAILS_REQUIRED','দাগ, জরিপ, Sheet, শ্রেণি ও নকশার ভিত্তি পূরণ করুন।');}
  $r['dag_no']=strtr($r['dag_no'],array_combine(preg_split('//u','০১২৩৪৫৬৭৮৯',-1,PREG_SPLIT_NO_EMPTY),str_split('0123456789')));
  if(!preg_match('/^[0-9]+(?:[\/\-][0-9]+)*$/',$r['dag_no'])||!in_array($r['survey'],['CS','SA','RS','BS','BDS'],true))self::fail('INVALID_DAG','দাগ নম্বর ও জরিপের ধরন সঠিকভাবে দিন।');
  $r['recorded_area']=(float)($b['recorded_area']??0);if(!is_finite($r['recorded_area'])||$r['recorded_area']<.0001||$r['recorded_area']>1000000000||abs($r['recorded_area']*10000-round($r['recorded_area']*10000))>.00001)self::fail('INVALID_AREA','রেকর্ড অনুযায়ী আয়তন দিন।');
  $g=G::validate($b['geometry']??null);$plot=(int)($b['plot_id']??0);
  if($plot&&!DB::selectOne('SELECT id FROM plots WHERE id=? AND location_id=? AND dag_no=?',[$plot,$loc,$r['dag_no']]))self::fail('PLOT_LOCATION_MISMATCH','রেকর্ডের দাগ ও মৌজা নকশার সঙ্গে মেলেনি।');
  $r['plot_id']=$plot?:null;$supersedes=(int)($b['supersedes_id']??0);
  return DB::transaction(static function()use($u,$id,$r,$b,$g,$supersedes){
   DB::statement('UPDATE map_mouza_offices SET updated_at=updated_at WHERE location_id=?',[$r['location_id']]);
   self::scope($u,(int)$r['location_id'],(int)$r['office_id']);
   $old=$id?DB::selectOne('SELECT * FROM map_parcel_designs WHERE id=?',[$id]):null;
   if($id&&(!$old||!self::allowed($u,(int)$old['location_id'],(int)$old['office_id'])))self::fail('DESIGN_NOT_FOUND','দাগ পাওয়া যায়নি।',404);
   if($old&&(!in_array($old['status'],['DRAFT','RETURNED'],true)||(int)$old['version']!==(int)($b['version']??0)))self::fail('DESIGN_CONFLICT','অন্য কেউ নকশা বদলেছেন বা জমা হয়েছে। তালিকা আবার খুলুন।',409);
   if($old&&((int)$old['location_id']!==$r['location_id']||(int)$old['office_id']!==$r['office_id']))self::fail('DESIGN_LOCATION_FIXED','সংশোধনের সময় মৌজা/অফিস বদলানো যায় না।');
   $parent=$supersedes?DB::selectOne("SELECT * FROM map_parcel_designs WHERE id=? AND status='PUBLISHED'",[$supersedes]):null;
   if($supersedes&&(!$parent||(int)$parent['location_id']!==$r['location_id']||$parent['dag_no']!==$r['dag_no']||$parent['survey']!==$r['survey']||$parent['sheet_no']!==$r['sheet_no']))self::fail('INVALID_REVISION','প্রকাশিত দাগের একই পরিচিতিতে সংশোধন তৈরি করুন।');
   $parentId=$old?(int)($old['supersedes_id']??0):$supersedes;
   if(DB::selectOne("SELECT id FROM map_parcel_designs WHERE location_id=? AND survey=? AND dag_no=? AND status<>'ARCHIVED' AND id<>? AND id<>?",[$r['location_id'],$r['survey'],$r['dag_no'],$id,$parentId]))self::fail('DUPLICATE_DAG','এই মৌজা ও জরিপে দাগটি আছে। তালিকা থেকে সেটি সংশোধন করুন।',409);
   self::collision($r,$g,$id,$parentId);$now=gmdate('c');$values=[$r['location_id'],$r['office_id'],$r['plot_id'],$r['dag_no'],$r['survey'],$r['sheet_no'],$r['land_use'],$r['recorded_area'],json_encode($g['geometry']),$g['area_sqm'],...$g['bbox'],$r['source_reference'],$now];
   if($old){$stmt=DB::connection()->prepare("UPDATE map_parcel_designs SET location_id=?,office_id=?,plot_id=?,dag_no=?,survey=?,sheet_no=?,land_use=?,recorded_area=?,geometry=?,area_sqm=?,xmin=?,ymin=?,xmax=?,ymax=?,source_reference=?,updated_at=?,version=version+1,status='DRAFT',created_by=? WHERE id=? AND version=?");$stmt->execute([...$values,$u['username'],$id,$old['version']]);if($stmt->rowCount()!==1)self::fail('DESIGN_CONFLICT','নকশা বদলেছে। আবার খুলুন।',409);$saved=$id;}
   else $saved=DB::insert('INSERT INTO map_parcel_designs(location_id,office_id,plot_id,dag_no,survey,sheet_no,land_use,recorded_area,geometry,area_sqm,xmin,ymin,xmax,ymax,source_reference,updated_at,created_by,created_at,supersedes_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[...$values,$u['username'],$now,$parentId?:null]);
   self::audit($u,'PARCEL_DRAFT_SAVED',(string)$saved,['location_id'=>$r['location_id'],'dag_no'=>$r['dag_no']]);return ['id'=>$saved];
  });
 }
 public static function decide(int $id,array $b,?array $actor=null):array {
  $u=self::user($actor);self::migrate();$action=(string)($b['action']??'');$reason=trim((string)($b['reason']??''));if(mb_strlen($reason)<12)self::fail('REASON_REQUIRED','সিদ্ধান্তের বিস্তারিত কারণ দিন।');
  return DB::transaction(static function()use($u,$id,$b,$action,$reason){
   $initial=DB::selectOne('SELECT location_id FROM map_parcel_designs WHERE id=?',[$id]);if(!$initial)self::fail('DESIGN_NOT_FOUND','দাগ পাওয়া যায়নি।',404);
   DB::statement('UPDATE map_mouza_offices SET updated_at=updated_at WHERE location_id=?',[$initial['location_id']]);
   $r=DB::selectOne('SELECT * FROM map_parcel_designs WHERE id=?',[$id]);if(!$r)self::fail('DESIGN_NOT_FOUND','দাগ পাওয়া যায়নি।',404);self::scope($u,(int)$r['location_id'],(int)$r['office_id']);
   if((int)$r['version']!==(int)($b['version']??0))self::fail('DESIGN_CONFLICT','নকশার সংস্করণ বদলেছে। আবার খুলুন।',409);
   $states=['submit'=>[['DRAFT','RETURNED'],'SUBMITTED'],'return'=>[['SUBMITTED'],'RETURNED'],'publish'=>[['SUBMITTED'],'PUBLISHED'],'archive'=>[['PUBLISHED'],'ARCHIVED']];
   if(!isset($states[$action])||!in_array($r['status'],$states[$action][0],true))self::fail('DESIGN_STATE_CONFLICT','এই অবস্থায় সিদ্ধান্তটি প্রযোজ্য নয়।',409);
   if($action!=='submit'){
    if(!self::admin($u)&&!in_array($u['role'],['ac_land','settlement_checker'],true))self::fail('REVIEW_ROLE_REQUIRED','পর্যালোচকের ভূমিকা প্রয়োজন।',403);
    if(!self::admin($u)&&$r['created_by']===$u['username'])self::fail('INDEPENDENT_REVIEW_REQUIRED','অন্য কর্মকর্তা নকশা পর্যালোচনা করবেন।',403);
   }
   if($action==='publish'&&$r['supersedes_id']&&!DB::selectOne("SELECT id FROM map_parcel_designs WHERE id=? AND status='PUBLISHED'",[$r['supersedes_id']]))self::fail('REVISION_CONFLICT','আগের নকশার অবস্থা বদলেছে। নতুন খসড়া তৈরি করুন।',409);
   if($action==='archive'&&DB::selectOne("SELECT q.design_id FROM map_parcel_owner_requests q JOIN onboarding_batches b ON b.id=q.batch_id WHERE q.design_id=? AND b.status='SUBMITTED'",[$id]))self::fail('ALLOCATION_PENDING','মালিকানা বরাদ্দের চলমান পর্যালোচনা আগে শেষ করুন।',409);
   if($action==='publish'&&$r['supersedes_id']&&DB::selectOne("SELECT q.design_id FROM map_parcel_owner_requests q JOIN onboarding_batches b ON b.id=q.batch_id WHERE q.design_id=? AND b.status='SUBMITTED'",[$r['supersedes_id']]))self::fail('ALLOCATION_PENDING','মালিকানা বরাদ্দের চলমান পর্যালোচনা আগে শেষ করুন।',409);
   if($action==='publish'&&($b['review_confirmed']??false)!==true)self::fail('MAP_REVIEW_REQUIRED','মৌজা, উৎস ও সীমানা যাচাই নিশ্চিত করুন।');
   if(in_array($action,['submit','publish'],true))self::collision($r,G::validate(json_decode($r['geometry'],true)),$id,(int)$r['supersedes_id']);
   $new=$states[$action][1];$stmt=DB::connection()->prepare('UPDATE map_parcel_designs SET status=?,version=version+1,reviewed_by=?,review_note=?,updated_at=? WHERE id=? AND version=?');$stmt->execute([$new,$u['username'],$reason,gmdate('c'),$id,$r['version']]);if($stmt->rowCount()!==1)self::fail('DESIGN_CONFLICT','নকশার অবস্থা বদলেছে।',409);
   if($action==='publish'&&$r['supersedes_id']){$parent=DB::selectOne('SELECT plot_id FROM map_parcel_designs WHERE id=?',[$r['supersedes_id']]);if($parent['plot_id'])DB::statement('UPDATE map_parcel_designs SET plot_id=? WHERE id=?',[$parent['plot_id'],$id]);DB::statement("UPDATE map_parcel_designs SET status='ARCHIVED',version=version+1,updated_at=? WHERE id=? AND status='PUBLISHED'",[gmdate('c'),$r['supersedes_id']]);self::audit($u,'PARCEL_REVISION_REPLACED',(string)$r['supersedes_id'],['replacement_id'=>$id]);}
   self::audit($u,'PARCEL_'.$new,(string)$id,['reason'=>$reason,'self_review'=>($r['created_by']===$u['username'])]);return ['id'=>$id,'status'=>$new];
  });
 }
 public static function allocationAccess(int $id,array $u):array {
  self::migrate();$r=DB::selectOne('SELECT * FROM map_parcel_designs WHERE id=?',[$id]);if(!$r)self::fail('DESIGN_NOT_FOUND','দাগ পাওয়া যায়নি।',404);if(!self::aclScope($u,(int)$r['location_id']))self::scope($u,(int)$r['location_id'],(int)$r['office_id']);
  if($r['status']!=='PUBLISHED'||$r['plot_id'])self::fail('ALLOCATION_NOT_AVAILABLE','প্রথমে নকশা প্রকাশ করুন। বিদ্যমান মালিকানার রেকর্ড বদলাতে হস্তান্তর প্রক্রিয়া ব্যবহার করুন।',409);return $r;
 }
 public static function validateAllocationRecord(int $id,array $u,array $r):void {
  $d=self::allocationAccess($id,$u);$l=DB::selectOne('SELECT * FROM locations WHERE id=?',[$d['location_id']]);
  foreach(['division_bn','division_en','district_bn','district_en','upazila_bn','upazila_en','mouza_bn','mouza_en','jl_no'] as $key)if($r[$key]!==$l[$key])self::fail('ALLOCATION_DESIGN_MISMATCH','মালিকানা বরাদ্দের মৌজা নকশার সঙ্গে মেলেনি।');
  if($r['dag_no']!==$d['dag_no']||$r['survey_type']!==$d['survey']||abs($r['area_decimal']-$d['recorded_area'])>.0001)self::fail('ALLOCATION_DESIGN_MISMATCH','দাগ, জরিপ ও আয়তন নকশার সঙ্গে মেলেনি।');
 }
 public static function lockAllocation(int $id,array $u,bool $creating=true):void {
  DB::statement('UPDATE map_parcel_designs SET version=version WHERE id=?',[$id]);self::allocationAccess($id,$u);
  if($creating&&DB::selectOne("SELECT q.design_id FROM map_parcel_owner_requests q JOIN onboarding_batches b ON b.id=q.batch_id WHERE q.design_id=? AND b.status<>'REJECTED'",[$id]))self::fail('ALLOCATION_PENDING','এই দাগের মালিকানা বরাদ্দ ইতিমধ্যে পর্যালোচনাধীন বা অনুমোদিত।',409);
 }
 public static function validateOwners(mixed $owners,float $total):array {
  if(!is_array($owners)||count($owners)<1||count($owners)>20)self::fail('OWNERS_REQUIRED','১–২০ জন মালিক ও প্রত্যেকের অংশ দিন।');$clean=[];$sum=0;$seen=[];
  foreach($owners as $entry){$nid=trim((string)($entry['nid']??''));$area=(float)($entry['area_decimal']??0);
   if(isset($seen[$nid])||!is_finite($area)||$area<.0001||$area>1000000000||abs($area*10000-round($area*10000))>.00001)self::fail('INVALID_OWNER_SHARE','একই মালিক দুইবার বা শূন্য/ঋণাত্মক অংশ দেওয়া যাবে না।');
   if(!DB::selectOne("SELECT p.id FROM users u JOIN persons p ON p.nid=u.nid WHERE u.nid=? AND u.role='citizen' AND u.is_active=1 AND u.is_identity_verified=1",[$nid]))self::fail('VERIFIED_OWNER_REQUIRED','প্রত্যেক মালিকের সক্রিয় ও পরিচয়-পর্যালোচিত নাগরিক অ্যাকাউন্ট প্রয়োজন।');
   $seen[$nid]=true;$sum+=$area;$clean[]=['nid'=>$nid,'area_decimal'=>$area];
  }if(abs($sum-$total)>.0001)self::fail('OWNER_AREA_MISMATCH','মালিকদের অংশের যোগফল দাগের রেকর্ডভুক্ত আয়তনের সমান হতে হবে।');return $clean;
 }
 public static function findOwner(array $q,?array $actor=null):array {
  $u=RoleMiddleware::authorize(['admin','system_admin','ac_land','land_office_assistant','settlement_records_officer'],$actor);self::migrate();$loc=(int)($q['location_id']??0);$m=DB::selectOne('SELECT office_id FROM map_mouza_offices WHERE location_id=?',[$loc]);self::scope($u,$loc,(int)($m['office_id']??0));
  $nid=trim((string)($q['nid']??''));if(!preg_match('/^(?:[0-9]{10}|[0-9]{17})$/',$nid))self::fail('INVALID_NID','১০ বা ১৭ সংখ্যার পরিচয় নম্বর দিন।');
  $p=DB::selectOne("SELECT p.name_bn,p.name_en FROM users u JOIN persons p ON p.nid=u.nid WHERE u.nid=? AND u.role='citizen' AND u.is_active=1 AND u.is_identity_verified=1",[$nid]);if(!$p)self::fail('VERIFIED_OWNER_REQUIRED','পরিচয়-পর্যালোচিত নাগরিক অ্যাকাউন্ট পাওয়া যায়নি।',404);return $p;
 }
 public static function allocate(int $id,array $b,?array $actor=null):array {
  $u=RoleMiddleware::authorize(['admin','system_admin','land_office_assistant','settlement_records_officer'],$actor);$d=self::allocationAccess($id,$u);$l=DB::selectOne('SELECT * FROM locations WHERE id=?',[$d['location_id']]);
  $body=array_merge($l,['parcel_design_id'=>$id,'owner_nid'=>$b['owners'][0]['nid']??'','owners'=>$b['owners']??[],'plot_code'=>'MAP-'.$d['location_id'].'-'.$d['survey'].'-'.$id,'dag_no'=>$d['dag_no'],'khatian_no'=>$b['khatian_no']??'','survey_type'=>$d['survey'],'survey_year'=>$b['survey_year']??0,'source_reference'=>$d['source_reference'],'area_decimal'=>$d['recorded_area'],'land_type_bn'=>$d['land_use'],'land_type_en'=>$b['land_type_en']??$d['land_use'],'source_base64'=>$b['source_base64']??'','source_name'=>$b['source_name']??'source.pdf']);
  return OpeningRecordController::create($body,$u);
 }
 public static function allocations(array $q,?array $actor=null):array {
  $u=self::user($actor);self::migrate();$loc=(int)($q['location_id']??0);$rows=DB::select('SELECT b.*,d.dag_no,d.id AS design_id,d.location_id,d.office_id,d.plot_id FROM map_parcel_owner_requests q JOIN onboarding_batches b ON b.id=q.batch_id JOIN map_parcel_designs d ON d.id=q.design_id WHERE d.location_id=? ORDER BY b.id DESC LIMIT 500',[$loc]);$out=[];
  foreach($rows as $row){if(!self::allowed($u,(int)$row['location_id'],(int)$row['office_id'])&&!self::aclScope($u,(int)$row['location_id']))continue;$p=json_decode($row['proof_package_json'],true);$row['owners']=array_map(static function($o){$p=DB::selectOne('SELECT name_bn FROM persons WHERE nid=?',[$o['nid']]);return ['name_bn'=>$p['name_bn']??'','nid_masked'=>substr($o['nid'],0,3).'****'.substr($o['nid'],-3),'area_decimal'=>$o['area_decimal']];},$p['owners']??[]);$row['khatian_no']=$p['record']['khatian_no'];$row['source_name']=$p['source_name'];$row['decision_reason']=$p['decision_reason']??'';unset($row['proof_package_json']);$out[]=$row;}
  return ['items'=>$out];
 }

}
