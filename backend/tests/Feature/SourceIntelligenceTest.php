<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||getenv('APP_ENV')!=='testing'||!getenv('BHUMISHIELD_TEST_DB'))exit(2);
require __DIR__.'/../../vendor/autoload.php';
use App\Http\Controllers\Api\V1\SourceIntelligenceController as C;
use App\Support\DB;
$n=0;function check($ok,$msg){global $n;if(!$ok)throw new RuntimeException($msg);$n++;echo "PASS $msg\n";}
function deny(callable $f,string $code){try{$f();throw new RuntimeException('Expected '.$code);}catch(Throwable $e){$v=json_decode($e->getMessage(),true);check(($v['code']??'')===$code,'Reject '.$code);}}
$admin=['id'=>0,'role'=>'admin','username'=>'synthetic.source.qa','is_active'=>1];$citizen=DB::selectOne("SELECT * FROM users WHERE role='citizen' LIMIT 1");
if(!$citizen)throw new RuntimeException('Disposable database must contain a citizen fixture');
$location=DB::selectOne('SELECT id FROM locations LIMIT 1');
C::migrate();$feesBefore=DB::select('SELECT * FROM service_fees_registry ORDER BY id');$ownersBefore=DB::select('SELECT * FROM ownerships ORDER BY id');$officesBefore=DB::select('SELECT * FROM offices ORDER BY id');
check(count(C::admin($admin)['sources'])>=8,'Eight official sources configured');
deny(fn()=>C::admin($citizen),'FORBIDDEN_ROLE');deny(fn()=>C::configure([],$citizen),'FORBIDDEN_ROLE');deny(fn()=>C::admin([...$admin,'is_active'=>0]),'ACCOUNT_SUSPENDED');
foreach(['http://land.gov.bd/','https://evil.test/','https://land.gov.bd.evil.test/','https://land.gov.bd/api/test','https://land.gov.bd/?nid=123','https://x@land.gov.bd/'] as $url)check(!C::validUrl($url),'Reject unsafe URL '.$url);
$key=bin2hex(random_bytes(4));$cfg=['kind'=>'GUIDE','title_bn'=>'Synthetic QA source only','url'=>'https://land.gov.bd/qa-'.$key,'enabled'=>1,'interval_hours'=>24];$sid=C::configure($cfg,$admin)['id'];$source=DB::selectOne('SELECT * FROM source_monitors WHERE id=?',[$sid]);
deny(fn()=>C::configure($cfg,$admin),'DUPLICATE_SOURCE');deny(fn()=>C::configure([...$cfg,'id'=>$sid,'version'=>0],$admin),'SOURCE_CONFLICT');deny(fn()=>C::configure([...$cfg,'id'=>$sid,'version'=>1,'url'=>'https://land.gov.bd/other'],$admin),'SOURCE_IDENTITY_IMMUTABLE');
$payload=function($text='Synthetic document index')use($source){return ['source_key'=>$source['source_key'],'kind'=>$source['kind'],'raw_sha256'=>hash('sha256',$text),'semantic_sha256'=>hash('sha256',$text),'items'=>[['title'=>$text,'excerpt'=>'Synthetic public text; never live government records','source_url'=>$source['url']]]];};
$r=C::ingest($source,$payload());check($r['new_candidates']===1,'New observation enters review queue');$id=(int)DB::selectOne('SELECT MAX(id) id FROM source_reviews')['id'];check(!count(C::publicItems()['items']),'Unreviewed text hidden from public');check(C::ingest($source,$payload())['new_candidates']===0,'Unchanged source is deduplicated');
$service=DB::selectOne('SELECT service_code FROM service_catalogue WHERE is_published=1 LIMIT 1')['service_code'];
$d=['summary'=>'Synthetic QA guidance; only used in disposable test database.','documents'=>['Synthetic title evidence','Synthetic identity evidence'],'steps'=>['Read original instructions','Prepare documents','Apply through the official service'],'attendance'=>'Confirm whether attendance is required with the responsible office.','service_code'=>$service,'location_id'=>(int)$location['id']];
$b=['action'=>'publish','version'=>1,'reason'=>'Synthetic original source reviewed for QA','source_verified'=>true,'details'=>$d];
deny(fn()=>C::decide($id,$b,$citizen),'FORBIDDEN_ROLE');deny(fn()=>C::decide($id,[...$b,'source_verified'=>false],$admin),'SOURCE_REVIEW_REQUIRED');deny(fn()=>C::decide($id,[...$b,'details'=>[...$d,'steps'=>[]]],$admin),'GUIDANCE_INCOMPLETE');deny(fn()=>C::decide($id,[...$b,'details'=>[...$d,'effective_date'=>'2026-02-30']],$admin),'INVALID_DATE');deny(fn()=>C::decide($id,[...$b,'details'=>[...$d,'service_code'=>'NO_SUCH_SERVICE']],$admin),'INVALID_SERVICE');
C::decide($id,$b,$admin);$public=C::publicItems()['items'];check(count($public)===1&&$public[0]['freshness']==='CHECKED','Reviewed guidance publishes with freshness');check(!isset($public[0]['excerpt'])&&!isset($public[0]['reviewed_by']),'Raw extraction and reviewer identifiers stay private');
check(count(C::publicItems(['service_code'=>'NO_SUCH_SERVICE'])['items'])===0,'Service filter isolates guidance');
check(count(C::publicItems(['scope'=>'GENERAL'])['items'])===0,'Unselected mouza never receives local-only guidance');
check(count(C::publicItems(['office_id'=>999999])['items'])===0,'Exact office page excludes unrelated mouza guidance');check(count(C::publicItems(['location_id'=>-1])['items'])===0,'Mouza filter isolates local guidance');
deny(fn()=>C::decide($id,[...$b,'action'=>'withdraw'],$admin),'REVIEW_CONFLICT');
C::ingest($source,$payload('Changed synthetic document index'));$id2=(int)DB::selectOne('SELECT MAX(id) id FROM source_reviews')['id'];check(C::publicItems()['items'][0]['freshness']==='UPDATE_PENDING','Changed source flags old publication for review');
C::decide($id2,$b,$admin);check(count(C::publicItems()['items'])===1,'Replacement preserves one published version');check(DB::selectOne('SELECT status FROM source_reviews WHERE id=?',[$id])['status']==='SUPERSEDED','Old version retained as superseded');
C::decide($id,['action'=>'restore','version'=>3,'source_verified'=>true,'reason'=>'Synthetic explicit rollback after checking source'],$admin);check(C::publicItems()['items'][0]['id']===$id,'Explicit rollback restores prior reviewed version');
DB::statement('UPDATE source_monitors SET last_error=? WHERE id=?',['Synthetic outage',$sid]);check(C::publicItems()['items'][0]['freshness']==='STALE','Outage retains approved guidance with stale warning');
$missing=$payload('New independent row');$missing['items'][0]['item_key']='different';C::ingest($source,$missing);check(C::publicItems()['items'][0]['freshness']==='SOURCE_MISSING','Removed source item requires rechecking');
C::decide($id,['action'=>'withdraw','version'=>4,'reason'=>'Synthetic withdrawal after QA review'],$admin);check(count(C::publicItems()['items'])===0,'Withdrawal hides summary without deletion');
foreach(['CIRCULAR','FEE','OFFICE','MAP','NOTICE','LINK'] as $kind){$s=C::configure([...$cfg,'kind'=>$kind,'url'=>'https://land.gov.bd/qa-'.$key.'-'.strtolower($kind)],$admin)['id'];$src=DB::selectOne('SELECT * FROM source_monitors WHERE id=?',[$s]);$r=$payload($kind.' synthetic item');$r['source_key']=$src['source_key'];$r['kind']=$kind;$r['items'][0]['source_url']=$src['url'];if($kind==='LINK')$r['items'][0]['health']='UNVERIFIED';C::ingest($src,$r);$rid=(int)DB::selectOne('SELECT MAX(id) id FROM source_reviews')['id'];
 if(in_array($kind,['CIRCULAR','FEE']))deny(fn()=>C::decide($rid,$b,$admin),'CIRCULAR_METADATA_REQUIRED');
 if($kind==='LINK'){deny(fn()=>C::decide($rid,$b,$admin),'LINK_UNVERIFIED');continue;}
 $extra=$kind==='NOTICE'?['deadline'=>'2020-01-01']:[];
 C::decide($rid,[...$b,'details'=>[...$d,...$extra,'reference'=>'QA-001','effective_date'=>'2026-10-18']],$admin);check(count(C::publicItems(['kind'=>$kind])['items'])===1,'Publish reviewed '.$kind);
 if($kind==='NOTICE')check(C::publicItems(['kind'=>'NOTICE'])['items'][0]['expired'],'Past notice deadline is marked expired');
}
check(C::subscriptions(['location_id'=>$location['id'],'enabled'=>true],true,$citizen)['location_ids']===[(int)$location['id']],'Citizen follows mouza');check(C::subscriptions(['location_id'=>$location['id'],'enabled'=>false],true,$citizen)['location_ids']===[],'Citizen unfollows mouza');
deny(fn()=>C::subscriptions(['location_id'=>-3,'enabled'=>true],true,$citizen),'INVALID_LOCATION');
C::configure([...$cfg,'id'=>$sid,'version'=>1,'enabled'=>0],$admin);deny(fn()=>C::collect($sid,$admin),'COLLECTION_GLOBALLY_DISABLED');
$control=C::collectionSettings();C::configureCollection(['enabled'=>true,'version'=>$control['version'],'reason'=>'Synthetic test of per-source control'],$admin);
deny(fn()=>C::collect($sid,$admin),'SOURCE_DISABLED');
$control=C::collectionSettings();C::configureCollection(['enabled'=>false,'version'=>$control['version'],'reason'=>'Return isolated test collection to off'],$admin);
check(DB::select('SELECT * FROM service_fees_registry ORDER BY id')===$feesBefore,'Review never changes transaction fees');check(DB::select('SELECT * FROM ownerships ORDER BY id')===$ownersBefore,'Review never changes ownership');check(DB::select('SELECT * FROM offices ORDER BY id')===$officesBefore,'Review never changes office scope or contacts');check(count(C::admin($admin)['history'])>=8,'Publication decisions preserve audit history');
$linked=\App\Http\Controllers\Api\V1\ServiceCatalogueController::getPublicService('MUTATION_ACLAND')['service'];
check(($linked['associated_fee']['service_code']??'')==='FEE_EMUTATION_ACLAND','Legacy fee codes resolve to the correct catalogue service');
$listed=\App\Http\Controllers\Api\V1\ServiceCatalogueController::listPublicFees()['items'];
check(count(array_filter($listed,fn($f)=>($f['related_service_code']??'')==='MUTATION_ACLAND'))===1,'Public fee list exposes explicit service relationship');
check(C::syncLinks($admin)['added']>=1,'Existing service links become monitors');check(C::syncLinks($admin)['added']===0,'Service link synchronization is idempotent');
deny(fn()=>C::syncLinks($citizen),'FORBIDDEN_ROLE');
echo "SOURCE INTELLIGENCE CHECKS: {$n} passed\n";
