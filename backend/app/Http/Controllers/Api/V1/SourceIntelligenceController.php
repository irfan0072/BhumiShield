<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;

/** Official-source observations are proposals; publication never mutates fees, rights or jurisdiction. */
final class SourceIntelligenceController
{
    private const KINDS=['CIRCULAR','FEE','OFFICE','GUIDE','MAP','NOTICE','LINK'];
    private static function fail(string $code,string $message,int $status=422): never {
        throw new \RuntimeException(json_encode(['code'=>$code,'status'=>$status,'message_bn'=>$message,'message_en'=>$message],JSON_UNESCAPED_UNICODE));
    }
    private static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
    public static function manifest(): array {return json_decode(file_get_contents(base_path('../tools/service_sources/sources.json')),true,512,JSON_THROW_ON_ERROR);}
    public static function migrate(): void {
        $id=DB::isPostgres()?'BIGSERIAL PRIMARY KEY':'INTEGER PRIMARY KEY AUTOINCREMENT';
        DB::statement("CREATE TABLE IF NOT EXISTS source_monitors (id {$id}, source_key TEXT NOT NULL UNIQUE, kind TEXT NOT NULL, title_bn TEXT NOT NULL, url TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, interval_hours INTEGER NOT NULL DEFAULT 168, last_attempt TEXT, last_success TEXT, last_error TEXT, semantic_sha256 TEXT, lease_until TEXT, version INTEGER NOT NULL DEFAULT 1)");
        DB::statement("CREATE TABLE IF NOT EXISTS source_observations (id {$id}, monitor_id INTEGER NOT NULL REFERENCES source_monitors(id), fetched_at TEXT NOT NULL, raw_sha256 TEXT NOT NULL, semantic_sha256 TEXT NOT NULL, payload_json TEXT NOT NULL, changed INTEGER NOT NULL)");
        DB::statement("CREATE TABLE IF NOT EXISTS source_reviews (id {$id}, monitor_id INTEGER NOT NULL REFERENCES source_monitors(id), observation_id INTEGER NOT NULL REFERENCES source_observations(id), identity_hash TEXT NOT NULL, content_hash TEXT NOT NULL, source_url TEXT NOT NULL, title TEXT NOT NULL, excerpt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', details_json TEXT NOT NULL DEFAULT '{}', version INTEGER NOT NULL DEFAULT 1, reviewed_by TEXT, review_note TEXT, reviewed_at TEXT, created_at TEXT NOT NULL)");
        DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS source_review_unique ON source_reviews(monitor_id,identity_hash,content_hash)');
        DB::statement("CREATE TABLE IF NOT EXISTS source_decisions (id {$id}, review_id INTEGER NOT NULL REFERENCES source_reviews(id), action TEXT NOT NULL, actor TEXT NOT NULL, reason TEXT NOT NULL, snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL)");
        DB::statement("CREATE TABLE IF NOT EXISTS source_subscriptions (id {$id}, user_id INTEGER NOT NULL REFERENCES users(id), location_id INTEGER NOT NULL REFERENCES locations(id), UNIQUE(user_id,location_id))");
        foreach(self::manifest() as $s) DB::statement('INSERT INTO source_monitors(source_key,kind,title_bn,url,interval_hours) VALUES(?,?,?,?,?) ON CONFLICT(source_key) DO NOTHING',[$s['key'],$s['kind'],$s['title_bn'],$s['url'],$s['interval_hours']]);
    }
    public static function validUrl(string $url): bool {
        $p=parse_url($url);$host=strtolower($p['host']??'');
        return strlen($url)<=1000 && filter_var($url,FILTER_VALIDATE_URL) && ($p['scheme']??'')==='https' && str_ends_with($host,'.gov.bd') && !isset($p['user'],$p['pass']) && !isset($p['user']) && !isset($p['pass']) && !isset($p['query']) && !isset($p['fragment']) && (!isset($p['port'])||$p['port']===443) && !preg_match('#/(api|login|admin|logout|auth|search|account)(/|$)#i',$p['path']??'');
    }
    public static function admin(?array $actor=null): array {
        RoleMiddleware::authorize(['admin'],$actor);self::migrate();
        $monitors=DB::select('SELECT * FROM source_monitors ORDER BY id');
        $reviews=DB::select('SELECT r.*,m.kind,m.title_bn AS monitor_title,m.last_success,m.last_error,m.interval_hours FROM source_reviews r JOIN source_monitors m ON m.id=r.monitor_id ORDER BY r.id DESC LIMIT 250');
        foreach($reviews as &$r){
            $r['details']=json_decode($r['details_json'],true);unset($r['details_json']);
            $prior=DB::selectOne('SELECT id,title,excerpt,details_json,status,reviewed_at FROM source_reviews WHERE monitor_id=? AND identity_hash=? AND id<? ORDER BY id DESC LIMIT 1',[$r['monitor_id'],$r['identity_hash'],$r['id']]);
            if($prior){$prior['details']=json_decode($prior['details_json'],true);unset($prior['details_json']);}$r['previous']=$prior;
        }unset($r);
        return ['sources'=>$monitors,'items'=>$reviews,'limit'=>250,'fees'=>ServiceCatalogueController::listPublicFees()['items'],
            'history'=>DB::select('SELECT id,review_id,action,actor,reason,created_at FROM source_decisions ORDER BY id DESC LIMIT 100')];
    }
    public static function syncLinks(?array $actor=null): array {
        RoleMiddleware::authorize(['admin'],$actor);self::migrate();$added=0;$skipped=0;
        foreach(DB::select('SELECT service_code,title_bn,external_url FROM service_catalogue WHERE is_published=1') as $service){
            $url=trim((string)($service['external_url']??''));
            if($url===''||!self::validUrl($url)){$skipped++;continue;}
            if(DB::selectOne("SELECT id FROM source_monitors WHERE url=? AND kind='LINK'",[$url]))continue;
            if((int)DB::selectOne('SELECT COUNT(*) c FROM source_monitors')['c']>=100)break;
            DB::statement("INSERT INTO source_monitors(source_key,kind,title_bn,url,interval_hours) VALUES(?,'LINK',?,?,168) ON CONFLICT(source_key) DO NOTHING",['service-link-'.substr(hash('sha256',$url),0,20),$service['title_bn'],$url]);$added++;
        }
        return ['added'=>$added,'skipped'=>$skipped];
    }
    public static function configure(array $b,?array $actor=null): array {
        RoleMiddleware::authorize(['admin'],$actor);self::migrate();
        $id=(int)($b['id']??0);$title=trim(strip_tags((string)($b['title_bn']??'')));$url=trim((string)($b['url']??''));$kind=(string)($b['kind']??'');$hours=(int)($b['interval_hours']??168);
        if(!self::validUrl($url)||!in_array($kind,self::KINDS,true)||$hours<24||$hours>720||mb_strlen($title)<3||mb_strlen($title)>180)self::fail('INVALID_SOURCE','সরকারি HTTPS পেজ, ধরন, নাম এবং ২৪–৭২০ ঘণ্টা ব্যবধান দিন।');
        if($id){
            $old=DB::selectOne('SELECT * FROM source_monitors WHERE id=?',[$id]);
            if(!$old)self::fail('NOT_FOUND','উৎসটি পাওয়া যায়নি।',404);
            // Source identity is immutable once observations exist. Add a new source for a moved URL.
            if($old['url']!==$url||$old['kind']!==$kind)self::fail('SOURCE_IDENTITY_IMMUTABLE','ঠিকানা বা ধরন বদলাতে নতুন উৎস যোগ করুন। পুরোনো উৎস বন্ধ রাখতে পারেন।');
            $count=DB::statement('UPDATE source_monitors SET title_bn=?,enabled=?,interval_hours=?,version=version+1 WHERE id=? AND version=?',[$title,!empty($b['enabled'])?1:0,$hours,$id,(int)($b['version']??0)]);
            if(!$count)self::fail('SOURCE_CONFLICT','অন্য পরিবর্তন হয়েছে। তালিকা আবার খুলুন।',409);
        }else{
            if((int)DB::selectOne('SELECT COUNT(*) c FROM source_monitors')['c']>=100)self::fail('SOURCE_LIMIT','সর্বোচ্চ ১০০ উৎস রাখা যাবে।');
            if(DB::selectOne('SELECT id FROM source_monitors WHERE url=? AND kind=?',[$url,$kind]))self::fail('DUPLICATE_SOURCE','উৎসটি ইতিমধ্যে আছে।');
            $id=DB::insert('INSERT INTO source_monitors(source_key,kind,title_bn,url,enabled,interval_hours) VALUES(?,?,?,?,?,?)',['custom-'.bin2hex(random_bytes(6)),$kind,$title,$url,!empty($b['enabled'])?1:0,$hours]);
        }
        return ['id'=>$id];
    }
    public static function collect(int $id,?array $actor=null): array {
        RoleMiddleware::authorize(['admin'],$actor);self::migrate();
        $source=DB::transaction(function()use($id){
            $s=DB::selectOne('SELECT * FROM source_monitors WHERE id=?'.(DB::isPostgres()?' FOR UPDATE':''),[$id]);
            if(!$s||!(int)$s['enabled'])self::fail('SOURCE_DISABLED','উৎস বন্ধ আছে অথবা পাওয়া যায়নি।');
            $now=self::now();
            if(($s['lease_until']??'')>$now)self::fail('COLLECTION_BUSY','এই উৎস থেকে সংগ্রহ চলছে।',409);
            if(($s['last_attempt']??'')>gmdate('Y-m-d\TH:i:s\Z',time()-300))self::fail('COLLECTION_COOLDOWN','একই উৎস আবার পরীক্ষা করার আগে ৫ মিনিট অপেক্ষা করুন।',429);
            DB::statement('UPDATE source_monitors SET lease_until=?,last_attempt=? WHERE id=?',[gmdate('Y-m-d\TH:i:s\Z',time()+60),$now,$id]);return $s;
        });
        try{
            if(!function_exists('proc_open'))throw new \RuntimeException('Python collector unavailable: proc_open is disabled. Use the documented CLI worker.');
            $python=(string)env('SOURCE_COLLECTOR_PYTHON','/usr/bin/python3');
            if(!str_starts_with($python,'/')||!is_executable($python))throw new \RuntimeException('Configure SOURCE_COLLECTOR_PYTHON to an installed Python 3 executable.');
            $pipes=[];$process=proc_open([$python,base_path('../tools/service_sources/collector.py'),'--stdin'],[['pipe','r'],['pipe','w'],['pipe','w']],$pipes);
            if(!is_resource($process))throw new \RuntimeException('Could not start collector.');
            fwrite($pipes[0],json_encode(['key'=>$source['source_key'],'kind'=>$source['kind'],'title_bn'=>$source['title_bn'],'url'=>$source['url']],JSON_UNESCAPED_UNICODE));fclose($pipes[0]);
            stream_set_blocking($pipes[1],false);stream_set_blocking($pipes[2],false);$output='';$start=microtime(true);
            do{$output.=stream_get_contents($pipes[1]);stream_get_contents($pipes[2]);$state=proc_get_status($process);
                if(strlen($output)>150000||microtime(true)-$start>40){proc_terminate($process);throw new \RuntimeException('Collection exceeded its time or size budget.');}
                if($state['running'])usleep(50000);
            }while($state['running']);
            $output.=stream_get_contents($pipes[1]);fclose($pipes[1]);fclose($pipes[2]);proc_close($process);
            $result=json_decode($output,true,512,JSON_THROW_ON_ERROR);
            if(!empty($result['error']))throw new \RuntimeException((string)$result['error']);
            return self::ingest($source,$result);
        }catch(\Throwable $e){
            if(isset($pipes))foreach($pipes as $pipe)if(is_resource($pipe))fclose($pipe);
            if(isset($process)&&is_resource($process))proc_close($process);
            DB::statement('UPDATE source_monitors SET last_error=?,lease_until=NULL WHERE id=?',[mb_substr($e->getMessage(),0,350),$id]);
            self::fail('SOURCE_FETCH_FAILED','উৎস যাচাই সম্পন্ন হয়নি: '.mb_substr($e->getMessage(),0,250).'; সর্বশেষ অনুমোদিত তথ্য অপরিবর্তিত আছে।',502);
        }
    }
    /** Trusted collector boundary, deliberately not exposed as an HTTP import endpoint. */
    public static function ingest(array $source,array $r): array {
        if(($r['source_key']??'')!==$source['source_key']||($r['kind']??'')!==$source['kind']||!preg_match('/^[a-f0-9]{64}$/',$r['raw_sha256']??'')||!preg_match('/^[a-f0-9]{64}$/',$r['semantic_sha256']??'')||!is_array($r['items']??null)||count($r['items'])>31||!count($r['items']))self::fail('INVALID_COLLECTION','সংগ্রহের ফল যাচাই হয়নি।');
        foreach($r['items'] as $item)if(!self::validUrl((string)($item['source_url']??''))||mb_strlen((string)($item['title']??''))<1||mb_strlen((string)$item['title'])>240||mb_strlen((string)($item['excerpt']??''))>600)self::fail('INVALID_COLLECTION','সংগ্রহের ফল নিরাপদ নয়।');
        return DB::transaction(function()use($source,$r){
            $current=DB::selectOne('SELECT * FROM source_monitors WHERE id=?'.(DB::isPostgres()?' FOR UPDATE':''),[$source['id']]);$changed=$current['semantic_sha256']!==$r['semantic_sha256'];$now=self::now();
            $oid=DB::insert('INSERT INTO source_observations(monitor_id,fetched_at,raw_sha256,semantic_sha256,payload_json,changed) VALUES(?,?,?,?,?,?)',[$source['id'],$now,$r['raw_sha256'],$r['semantic_sha256'],json_encode($r,JSON_UNESCAPED_UNICODE),$changed?1:0]);$added=0;
            foreach($r['items'] as $i){
                $identity=hash('sha256',$i['source_url'].'|'.($i['item_key']??''));$hash=hash('sha256',json_encode($i,JSON_UNESCAPED_UNICODE));
                if(DB::selectOne('SELECT id FROM source_reviews WHERE monitor_id=? AND identity_hash=? AND content_hash=?',[$source['id'],$identity,$hash]))continue;
                // A changed source invalidates automatic republication. Old approved versions remain visible with an update warning.
                DB::insert('INSERT INTO source_reviews(monitor_id,observation_id,identity_hash,content_hash,source_url,title,excerpt,details_json,created_at) VALUES(?,?,?,?,?,?,?,?,?)',[$source['id'],$oid,$identity,$hash,$i['source_url'],strip_tags($i['title']),strip_tags($i['excerpt']??''),json_encode(['health'=>$i['health']??null,'check_note'=>$i['check_note']??null,'item_key'=>$i['item_key']??''],JSON_UNESCAPED_UNICODE),$now]);$added++;
            }
            DB::statement('UPDATE source_monitors SET last_success=?,last_error=NULL,semantic_sha256=?,lease_until=NULL WHERE id=?',[$now,$r['semantic_sha256'],$source['id']]);
            return ['observation_id'=>$oid,'changed'=>$changed,'new_candidates'=>$added];
        });
    }
    private static function details(array $b): array {
        $d=[];
        foreach(['summary','attendance','reference'] as $key){$d[$key]=trim(strip_tags((string)($b[$key]??'')));if(mb_strlen($d[$key])>1500)self::fail('TEXT_TOO_LONG','বিবরণ সংক্ষিপ্ত করুন।');}
        foreach(['documents','steps'] as $key){$arr=$b[$key]??[];if(!is_array($arr)||count($arr)>20)self::fail('INVALID_GUIDANCE','সর্বোচ্চ ২০টি ধাপ বা কাগজপত্র দিন।');$d[$key]=[];foreach($arr as $v){if(!is_string($v)||mb_strlen($v)>300)self::fail('INVALID_GUIDANCE','প্রতিটি বিষয় ৩০০ অক্ষরের মধ্যে লিখুন।');if(trim($v)!=='')$d[$key][]=trim(strip_tags($v));}}
        foreach(['published_date','effective_date','deadline'] as $key){$v=(string)($b[$key]??'');if($v!==''&&(!preg_match('/^\d{4}-\d{2}-\d{2}$/',$v)||!checkdate((int)substr($v,5,2),(int)substr($v,8,2),(int)substr($v,0,4))))self::fail('INVALID_DATE','সঠিক তারিখ দিন।');$d[$key]=$v;}
        $d['service_code']=trim((string)($b['service_code']??''));if($d['service_code']!==''&&!DB::selectOne('SELECT id FROM service_catalogue WHERE service_code=?',[$d['service_code']]))self::fail('INVALID_SERVICE','বিদ্যমান সেবা নির্বাচন করুন।');
        foreach(['location_id'=>'locations','office_id'=>'offices'] as $key=>$table){$d[$key]=(int)($b[$key]??0);if($d[$key]&&!DB::selectOne("SELECT id FROM {$table} WHERE id=?",[$d[$key]]))self::fail('INVALID_LINK','নিবন্ধিত মৌজা বা অফিস নির্বাচন করুন।');}
        if($d['office_id']&&$d['location_id']){
            $loc=DB::selectOne('SELECT district_en,upazila_en FROM locations WHERE id=?',[$d['location_id']]);$off=DB::selectOne('SELECT district_en,upazila_en FROM offices WHERE id=?',[$d['office_id']]);
            if($loc['district_en']!==$off['district_en']||($off['upazila_en']!==''&&$loc['upazila_en']!==$off['upazila_en']))self::fail('OFFICE_AREA_MISMATCH','মৌজার এলাকার সঙ্গে অফিস মিলছে না।');
        }
        return $d;
    }
    public static function decide(int $id,array $b,?array $actor=null): array {
        $u=RoleMiddleware::authorize(['admin'],$actor);self::migrate();$action=(string)($b['action']??'');$reason=trim(strip_tags((string)($b['reason']??'')));
        if(!in_array($action,['publish','reject','withdraw','restore'],true)||mb_strlen($reason)<12||mb_strlen($reason)>1000)self::fail('REVIEW_REASON_REQUIRED','কী যাচাই করেছেন তা অন্তত ১২ অক্ষরে লিখুন।');
        return DB::transaction(function()use($id,$b,$u,$action,$reason){
            $scope=DB::selectOne('SELECT monitor_id FROM source_reviews WHERE id=?',[$id]);
            if(!$scope)self::fail('NOT_FOUND','তথ্যটি পাওয়া যায়নি।',404);
            if(DB::isPostgres())DB::selectOne('SELECT id FROM source_monitors WHERE id=? FOR UPDATE',[$scope['monitor_id']]);
            $r=DB::selectOne('SELECT r.*,m.kind FROM source_reviews r JOIN source_monitors m ON m.id=r.monitor_id WHERE r.id=?',[$id]);if(!$r)self::fail('NOT_FOUND','তথ্যটি পাওয়া যায়নি।',404);
            if((int)$r['version']!==(int)($b['version']??0))self::fail('REVIEW_CONFLICT','অন্য পর্যালোচক পরিবর্তন করেছেন। তালিকা আবার খুলুন।',409);
            $d=json_decode($r['details_json'],true)?:[];$now=self::now();
            if(in_array($action,['publish','restore'],true)){
                if(($action==='publish'&&$r['status']!=='PENDING')||($action==='restore'&&!in_array($r['status'],['WITHDRAWN','SUPERSEDED'],true)))self::fail('INVALID_TRANSITION','এই অবস্থায় প্রকাশ করা যাবে না।');
                if(empty($b['source_verified']))self::fail('SOURCE_REVIEW_REQUIRED','মূল সরকারি উৎস পড়ে যাচাই নিশ্চিত করুন।');
                if($action==='publish')$d=[...$d,...self::details($b['details']??[])];
                if(mb_strlen($d['summary']??'')<20)self::fail('SUMMARY_REQUIRED','নিজের ভাষায় যাচাইকৃত সারাংশ অন্তত ২০ অক্ষরে লিখুন।');
                if($r['kind']==='GUIDE'&&(!$d['service_code']||!count($d['steps'])||!count($d['documents'])||!$d['attendance']))self::fail('GUIDANCE_INCOMPLETE','সহায়িকায় সেবা, ধাপ, কাগজপত্র ও উপস্থিতির নির্দেশনা আবশ্যক।');
                if(in_array($r['kind'],['CIRCULAR','FEE'],true)&&(!$d['reference']||!$d['effective_date']))self::fail('CIRCULAR_METADATA_REQUIRED','স্মারক নম্বর এবং কার্যকারিতার তারিখ যাচাই করে দিন।');
                if($r['kind']==='LINK'&&(($d['health']??'')!=='REACHABLE'))self::fail('LINK_UNVERIFIED','সর্বশেষ পরীক্ষায় লিংকটি খোলা যায়নি। আবার সংগ্রহ ও যাচাই করুন।');
                if(DB::selectOne("SELECT id FROM source_reviews WHERE monitor_id=? AND identity_hash=? AND status='PENDING' AND id>?",[$r['monitor_id'],$r['identity_hash'],$id]))self::fail('NEWER_SOURCE_PENDING','উৎসের নতুন পরিবর্তন এসেছে। আগে সর্বশেষ তথ্য যাচাই করুন।',409);
                DB::statement("UPDATE source_reviews SET status='SUPERSEDED',version=version+1 WHERE monitor_id=? AND identity_hash=? AND status='PUBLISHED' AND id<>?",[$r['monitor_id'],$r['identity_hash'],$id]);$status='PUBLISHED';
            }else{
                if(($action==='reject'&&$r['status']!=='PENDING')||($action==='withdraw'&&$r['status']!=='PUBLISHED'))self::fail('INVALID_TRANSITION','এই অবস্থায় সিদ্ধান্তটি প্রযোজ্য নয়।');
                $status=$action==='reject'?'REJECTED':'WITHDRAWN';
            }
            $updated=DB::statement('UPDATE source_reviews SET status=?,details_json=?,reviewed_by=?,review_note=?,reviewed_at=?,version=version+1 WHERE id=? AND version=?',[$status,json_encode($d,JSON_UNESCAPED_UNICODE),$u['username'],$reason,$now,$id,$r['version']]);
            if(!$updated)self::fail('REVIEW_CONFLICT','একই সময়ে পরিবর্তন হয়েছে।',409);
            DB::insert('INSERT INTO source_decisions(review_id,action,actor,reason,snapshot_json,created_at) VALUES(?,?,?,?,?,?)',[$id,$action,$u['username'],$reason,json_encode($r,JSON_UNESCAPED_UNICODE),$now]);
            return ['id'=>$id,'status'=>$status];
        });
    }
    public static function publicItems(array $q=[]): array {
        self::migrate();$where=" WHERE r.status='PUBLISHED'";$args=[];
        if(in_array($q['kind']??'',self::KINDS,true)){$where.=' AND m.kind=?';$args[]=$q['kind'];}
        $rows=DB::select('SELECT r.id,r.monitor_id,r.identity_hash,r.source_url,r.title,r.details_json,r.reviewed_at,r.created_at,m.kind,m.last_success,m.last_error,m.interval_hours FROM source_reviews r JOIN source_monitors m ON m.id=r.monitor_id'.$where.' ORDER BY r.id DESC LIMIT 250',$args);$out=[];
        foreach($rows as $r){$d=json_decode($r['details_json'],true)?:[];
            if(!empty($q['location_id'])&&!empty($d['location_id'])&&(int)$d['location_id']!==(int)$q['location_id'])continue;
            if(($q['scope']??'')==='GENERAL'&&!empty($d['location_id']))continue;
            if(!empty($q['office_id'])){
                if(!empty($d['office_id'])&&(int)$d['office_id']!==(int)$q['office_id'])continue;
                if(empty($d['office_id'])&&!empty($d['location_id']))continue;
            }
            if(!empty($q['service_code'])&&($d['service_code']??'')!==$q['service_code'])continue;
            if(!empty($q['q'])&&!str_contains(mb_strtolower($r['title'].' '.($d['summary']??'')),mb_strtolower(mb_substr((string)$q['q'],0,100))))continue;
            $latest=DB::selectOne('SELECT payload_json FROM source_observations WHERE monitor_id=? ORDER BY id DESC LIMIT 1',[$r['monitor_id']]);
            $present=false;foreach((json_decode($latest['payload_json']??'{}',true)['items']??[]) as $observed)if(hash('sha256',$observed['source_url'].'|'.($observed['item_key']??''))===$r['identity_hash'])$present=true;
            $pending=DB::selectOne("SELECT id FROM source_reviews WHERE monitor_id=? AND identity_hash=? AND status='PENDING' AND id>? LIMIT 1",[$r['monitor_id'],$r['identity_hash'],$r['id']]);
            $r['freshness']=!$present?'SOURCE_MISSING':($pending?'UPDATE_PENDING':(!empty($r['last_error'])||!$r['last_success']||strtotime($r['last_success'])<time()-(int)$r['interval_hours']*3600?'STALE':'CHECKED'));
            $r['expired']=!empty($d['deadline'])&&$d['deadline']<gmdate('Y-m-d');$r['details']=$d;unset($r['details_json'],$r['last_error'],$r['identity_hash'],$r['monitor_id']);$out[]=$r;
        }
        return ['items'=>$out,'limit'=>250];
    }
    public static function context(): array {
        self::migrate();return ['services'=>ServiceCatalogueController::listPublicServices()['items'],
            'locations'=>DB::select('SELECT id,division_bn,district_bn,district_en,upazila_bn,upazila_en,mouza_bn,jl_no FROM locations ORDER BY district_bn,upazila_bn,mouza_bn LIMIT 2000'),
            'offices'=>DB::select('SELECT id,name_bn,name_en,office_type,district_en,upazila_en,address_bn,contact_phone FROM offices WHERE is_active=1 ORDER BY name_bn LIMIT 2000'),
            'locations_limit'=>2000];
    }
    public static function subscriptions(array $b=[],bool $write=false,?array $actor=null): array {
        $u=RoleMiddleware::authorize([],$actor);self::migrate();
        if($write){$id=(int)($b['location_id']??0);if(!DB::selectOne('SELECT id FROM locations WHERE id=?',[$id]))self::fail('INVALID_LOCATION','নিবন্ধিত মৌজা নির্বাচন করুন।');
            if(empty($b['enabled']))DB::statement('DELETE FROM source_subscriptions WHERE user_id=? AND location_id=?',[$u['id'],$id]);
            else{if((int)DB::selectOne('SELECT COUNT(*) c FROM source_subscriptions WHERE user_id=?',[$u['id']])['c']>=20)self::fail('SUBSCRIPTION_LIMIT','সর্বোচ্চ ২০ মৌজা অনুসরণ করা যাবে।');DB::statement('INSERT INTO source_subscriptions(user_id,location_id) VALUES(?,?) ON CONFLICT(user_id,location_id) DO NOTHING',[$u['id'],$id]);}}
        return ['location_ids'=>array_map('intval',array_column(DB::select('SELECT location_id FROM source_subscriptions WHERE user_id=?',[$u['id']]),'location_id'))];
    }
}
