<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'||getenv('APP_ENV')!=='testing'||!getenv('BHUMISHIELD_TEST_DB'))exit(2);
require __DIR__.'/../../vendor/autoload.php';
use App\Http\Controllers\Api\V1\SourceIntelligenceController as C;
use App\Support\DB;
$n=0;
function checkControl(bool $ok,string $message):void {global $n;if(!$ok)throw new RuntimeException($message);$n++;echo "PASS {$message}\n";}
function denyControl(callable $f,string $code):void {try{$f();throw new RuntimeException('Expected denial');}catch(Throwable $e){$v=json_decode($e->getMessage(),true);checkControl(($v['code']??'')===$code,'Reject '.$code);}}
$admin=['id'=>0,'role'=>'admin','username'=>'synthetic.control.qa','is_active'=>1];
$system=[...$admin,'role'=>'system_admin'];$citizen=[...$admin,'role'=>'citizen'];
C::migrate();
checkControl(C::collectionSettings()['enabled']===false,'Existing installation defaults collection OFF');
$s=C::collectionSettings();$body=['enabled'=>true,'version'=>$s['version'],'reason'=>'Synthetic control regression test'];
denyControl(fn()=>C::configureCollection($body),'AUTH_REQUIRED');
denyControl(fn()=>C::configureCollection($body,$citizen),'FORBIDDEN_ROLE');
denyControl(fn()=>C::configureCollection($body,[...$admin,'is_active'=>0]),'ACCOUNT_SUSPENDED');
denyControl(fn()=>C::configureCollection([...$body,'enabled'=>'false'],$admin),'INVALID_COLLECTION_SETTING');
denyControl(fn()=>C::configureCollection([...$body,'reason'=>'short'],$admin),'INVALID_COLLECTION_SETTING');
$before=DB::select('SELECT id,last_attempt,lease_until FROM source_monitors ORDER BY id');
$observations=DB::selectOne('SELECT COUNT(*) c FROM source_observations')['c'];
denyControl(fn()=>C::collect(1,$admin),'COLLECTION_GLOBALLY_DISABLED');
checkControl(DB::select('SELECT id,last_attempt,lease_until FROM source_monitors ORDER BY id')===$before,'Blocked collect does not lease or attempt a source');
checkControl(DB::selectOne('SELECT COUNT(*) c FROM source_observations')['c']===$observations,'Blocked collect preserves prior observations');
C::configureCollection($body,$system);
checkControl(C::collectionSettings()['enabled']===true,'Super admin can enable with reason');
C::migrate();checkControl(C::collectionSettings()['enabled']===true,'Migration preserves explicit configuration');
denyControl(fn()=>C::configureCollection($body,$admin),'COLLECTION_SETTING_CONFLICT');
$id=DB::insert('INSERT INTO source_monitors(source_key,kind,title_bn,url,enabled,interval_hours) VALUES(?,?,?,?,0,24)',['synthetic-disabled-control','LINK','Synthetic disabled source','https://land.gov.bd/qa-disabled']);
denyControl(fn()=>C::collect($id,$admin),'SOURCE_DISABLED');
$now=C::collectionSettings();C::configureCollection(['enabled'=>false,'version'=>$now['version'],'reason'=>'Disable again after synthetic regression'],$admin);
checkControl(C::collectionSettings()['enabled']===false,'Admin can deactivate after enabling');
denyControl(fn()=>C::collect($id,$admin),'COLLECTION_GLOBALLY_DISABLED');
$history=DB::select('SELECT enabled,actor,reason FROM source_collection_events ORDER BY id');
checkControl(count($history)===2&&(int)$history[0]['enabled']===1&&(int)$history[1]['enabled']===0,'Toggle changes retain actor, reason and ordered history');
// Fresh database also receives OFF, without a business-data seed or network request.
$fresh=getenv('BHUMISHIELD_TEST_DB').'.fresh';putenv('BHUMISHIELD_TEST_DB='.$fresh);DB::resetConnection();
checkControl(C::collectionSettings()['enabled']===false,'Fresh installation defaults OFF');
echo "COLLECTION CONTROL CHECKS: {$n} passed; no external requests\n";
