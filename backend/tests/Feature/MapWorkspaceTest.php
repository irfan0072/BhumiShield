<?php
declare(strict_types=1);
// Explicit standalone isolated check. Never runs against the usable database.
if (PHP_SAPI !== 'cli' || getenv('APP_ENV') !== 'testing' || !getenv('BHUMISHIELD_TEST_DB')) { fwrite(STDERR,"An explicit isolated testing database is required.\n");exit(2); }
require __DIR__.'/../../vendor/autoload.php';
use App\Support\DB;
use App\Http\Controllers\Api\V1\MapWorkspaceController as M;
$admin=DB::selectOne("SELECT * FROM users WHERE role='admin' LIMIT 1");$citizen=DB::selectOne("SELECT * FROM users WHERE role='citizen' LIMIT 1");$location=DB::selectOne('SELECT * FROM locations ORDER BY id LIMIT 1');$plot=DB::selectOne('SELECT * FROM plots WHERE location_id=? ORDER BY id LIMIT 1',[$location['id']]);
if(!$admin||!$citizen||!$location||!$plot)throw new RuntimeException('Disposable audit fixtures required.');
$tests=0;function ok($condition,$message){global $tests;if(!$condition)throw new RuntimeException($message);$tests++;echo "PASS $message\n";}
function denied(callable $fn,string $code){try{$fn();throw new RuntimeException('Expected rejection '.$code);}catch(Throwable $e){$r=json_decode($e->getMessage(),true);ok(($r['code']??'')===$code,'Reject '.$code);}}
$lat=(float)$location['latitude'];$lon=(float)$location['longitude'];
$body=['title'=>'QA ONLY - isolated geometry lifecycle','location_id'=>$location['id'],'layer_kind'=>'cadastre','source_url'=>'https://example.invalid/qa-only','rights_note'=>'Synthetic QA geometry, disposable local database only. Not a government map.','observed_at'=>gmdate('Y-m-d'),'geojson'=>['type'=>'FeatureCollection','features'=>[['type'=>'Feature','geometry'=>['type'=>'Polygon','coordinates'=>[[[$lon,$lat],[$lon+.0001,$lat],[$lon+.0001,$lat+.0001],[$lon,$lat]]]],'properties'=>['plot_id'=>$plot['id'],'dag_no'=>(string)$plot['dag_no'],'sheet_no'=>'QA','owner_nid'=>'MUST_NOT_PUBLISH','label'=>'QA synthetic geometry']]]]];
denied(fn()=>M::import($body,$citizen),'FORBIDDEN_ROLE');
$r=M::import($body,$admin);$id=(int)$r['id'];ok($r['status']==='DRAFT','Import is draft');
denied(fn()=>M::geometry($id),'MAP_NOT_FOUND');
$g=M::geometry($id,true,$admin);ok(!isset($g['geojson']['features'][0]['properties']['owner_nid']),'Strip private/unapproved properties');
denied(fn()=>M::import($body,$admin),'DUPLICATE_MAP');
denied(fn()=>M::transition($id,['status'=>'PUBLISHED','reason'=>'QA publication for lifecycle test'],$admin),'RIGHTS_REVIEW_REQUIRED');
M::transition($id,['status'=>'PUBLISHED','reason'=>'QA-only source and location reviewed for isolated test','rights_confirmed'=>true],$admin);
ok(M::geometry($id)['status']==='PUBLISHED','Published geometry visible');
denied(fn()=>M::transition($id,['status'=>'PUBLISHED','reason'=>'QA replay must not succeed','rights_confirmed'=>true],$admin),'MAP_STATE_CONFLICT');
M::transition($id,['status'=>'ARCHIVED','reason'=>'QA publication withdrawn; preserve history'],$admin);denied(fn()=>M::geometry($id),'MAP_NOT_FOUND');ok(M::geometry($id,true,$admin)['status']==='ARCHIVED','Admin can inspect archived source');
$bad=$body;$bad['geojson']['features'][0]['geometry']['coordinates'][0][0]=[0,0];denied(fn()=>M::import($bad,$admin),'OPEN_RING');
$bad=$body;$bad['geojson']['features'][0]['properties']['plot_id']=999999;denied(fn()=>M::import($bad,$admin),'PLOT_LOCATION_MISMATCH');
$bad=$body;$bad['geojson']['features'][0]['properties']['dag_no']='wrong';denied(fn()=>M::import($bad,$admin),'DAG_MISMATCH');
$bad=$body;$bad['geojson']['crs']=['type'=>'name','properties'=>['name'=>'EPSG:3857']];denied(fn()=>M::import($bad,$admin),'INVALID_GEOJSON');
$bad=$body;$bad['observed_at']='2026-02-30';denied(fn()=>M::import($bad,$admin),'INVALID_DATE');
$bad=$body;$bad['geojson']['features'][0]['properties']='invalid';denied(fn()=>M::import($bad,$admin),'INVALID_PROPERTIES');
$bad=$body;$bad['geojson']['features'][0]['geometry']=['type'=>'Point','coordinates'=>['90','24']];denied(fn()=>M::import($bad,$admin),'INVALID_COORDINATES');
$w=M::workspace(['location_id'=>$location['id'],'q'=>$plot['dag_no_bn']]);ok(count($w['plots'])===1&&(int)$w['plots'][0]['id']===(int)$plot['id'],'Bangla dag search preserves identity');ok(!isset($w['plots'][0]['locked_by_nid']),'Public records exclude owner identifiers');ok(count($w['plots'])<=60,'Bounded record response');
ok((int)(DB::selectOne("SELECT COUNT(*) AS c FROM audit_log WHERE entity_type='map_dataset' AND entity_id=?",[(string)$id])['c']??0)>=3,'Import, publish and withdrawal audited');
echo "MAP CHECKS: {$tests} passed\n";
