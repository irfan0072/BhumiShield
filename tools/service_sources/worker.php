#!/usr/bin/env php
<?php
/** Run from an operator's scheduler. No database reset, seed, publication or fee changes. */
declare(strict_types=1);
if(PHP_SAPI!=='cli')exit(2);
require __DIR__.'/../../backend/vendor/autoload.php';
use App\Http\Controllers\Api\V1\SourceIntelligenceController as C;
use App\Support\DB;
C::migrate();
if(in_array('--migrate',$argv,true)){echo "Source tables ready. No business records changed.\n";exit;}
$only=null;foreach($argv as $arg)if(str_starts_with($arg,'--source='))$only=substr($arg,9);
$max=2;foreach($argv as $arg)if(str_starts_with($arg,'--limit='))$max=max(1,min(8,(int)substr($arg,8)));
$actor=['id'=>0,'username'=>'source-collector-cli','role'=>'admin','is_active'=>1];$count=0;
$watch=in_array('--watch',$argv,true);
do { $count=0;
if(in_array('--sync-links',$argv,true)){echo json_encode(C::syncLinks($actor))."\n";exit;}
if(!C::collectionSettings()['enabled']){
 echo "Collection is globally OFF. No government pages requested.\n";
 if(!$watch)exit;
 sleep(15);continue;
}
foreach(DB::select('SELECT * FROM source_monitors WHERE enabled=1 ORDER BY COALESCE(last_attempt,\'\'),id') as $s){
 if($count>=$max)break;
 if($only!==null&&$only!==$s['source_key'])continue;
 if($only===null&&($s['last_attempt']??'')!==''&&strtotime($s['last_attempt'])>time()-(int)$s['interval_hours']*3600)continue;
 $count++;
 try{$r=C::collect((int)$s['id'],$actor);echo json_encode(['source'=>$s['source_key'],'result'=>$r],JSON_UNESCAPED_UNICODE)."\n";}
 catch(Throwable $e){$v=json_decode($e->getMessage(),true);echo json_encode(['source'=>$s['source_key'],'error'=>$v['message_en']??$e->getMessage()],JSON_UNESCAPED_UNICODE)."\n";}
}
echo "Checked {$count} due sources; nothing is published automatically.\n";
if($watch)sleep(900);
} while($watch);
