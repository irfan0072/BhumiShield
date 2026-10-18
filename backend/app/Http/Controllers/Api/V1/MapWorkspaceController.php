<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api\V1;

use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;

/** Published geographic evidence is separate from authoritative ownership records. */
final class MapWorkspaceController
{
    private static function fail(string $code, string $message, int $status = 422): never
    {
        throw new \RuntimeException(json_encode(['status'=>$status,'code'=>$code,'message_bn'=>$message,'message_en'=>$message], JSON_UNESCAPED_UNICODE));
    }

    public static function migrate(): void
    {
        $id = DB::isPostgres() ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        DB::statement("CREATE TABLE IF NOT EXISTS map_datasets (
            id {$id}, title TEXT NOT NULL, location_id INTEGER NOT NULL REFERENCES locations(id),
            layer_kind TEXT NOT NULL, source_url TEXT NOT NULL, rights_note TEXT NOT NULL,
            observed_at TEXT NOT NULL, geojson TEXT NOT NULL, sha256 TEXT NOT NULL,
            feature_count INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT',
            created_by TEXT NOT NULL, reviewed_by TEXT, review_note TEXT,
            created_at TEXT NOT NULL, updated_at TEXT NOT NULL)");
        DB::statement('CREATE INDEX IF NOT EXISTS map_datasets_location_status ON map_datasets(location_id,status)');
    }

    public static function workspace(array $query): array
    {
        // Bounded public projection: never publish person identifiers or raw case documents.
        $locations = DB::select('SELECT id,division_bn,division_en,district_bn,district_en,upazila_bn,upazila_en,mouza_bn,mouza_en,jl_no,latitude,longitude FROM locations ORDER BY division_bn,district_bn,upazila_bn,mouza_bn LIMIT 2000');
        $locationId = max(0, (int)($query['location_id'] ?? 0));
        $q = trim(strtr((string)($query['q'] ?? ''),array_combine(preg_split('//u','০১২৩৪৫৬৭৮৯',-1,PREG_SPLIT_NO_EMPTY),str_split('0123456789'))));
        $page = max(1,min(100000,(int)($query['page'] ?? 1)));
        $where = ' WHERE 1=1'; $bindings = [];
        if ($locationId) { $where .= ' AND p.location_id=?'; $bindings[] = $locationId; }
        foreach(['division','district','upazila'] as $area) {
            if(!empty($query[$area])) { $where.=' AND p.location_id IN (SELECT id FROM locations WHERE '.$area.'_bn=?)';$bindings[]=mb_substr((string)$query[$area],0,120); }
        }
        if ($q !== '') { $where .= ' AND (p.dag_no=? OR p.plot_code LIKE ?)'; $bindings[]=$q; $bindings[]='%'.substr($q,0,100).'%'; }
        $total = (int)(DB::selectOne('SELECT COUNT(*) AS c FROM plots p'.$where,$bindings)['c']??0);
        $plots = DB::select('SELECT p.id,p.location_id,p.plot_code,p.dag_no,p.dag_no_bn,p.total_area_decimal,p.land_type_bn,p.land_type_en,p.owner_sale_locked,p.is_admin_frozen,
            CASE WHEN EXISTS(SELECT 1 FROM mortgages_liens m WHERE m.plot_id=p.id AND m.status=\'ACTIVE\') THEN 1 ELSE 0 END AS has_active_lien
            FROM plots p'.$where.' ORDER BY p.id LIMIT 60 OFFSET '.(($page-1)*60),$bindings);
        $officeBindings=[]; $officeWhere=' WHERE is_active=1';
        if ($locationId) {
            $location=DB::selectOne('SELECT * FROM locations WHERE id=?',[$locationId]);
            if (!$location) self::fail('LOCATION_NOT_FOUND','মৌজাটি পাওয়া যায়নি।',404);
            $officeWhere.=' AND district_en=? AND upazila_en=?'; $officeBindings=[$location['district_en'],$location['upazila_en']];
        }
        $offices=DB::select('SELECT id,name_bn,name_en,office_type,district_en,upazila_en,latitude,longitude,address_bn,address_en FROM offices'.$officeWhere.' ORDER BY id LIMIT 100',$officeBindings);
        return ['locations'=>$locations,'locations_truncated'=>count($locations)===2000,'plots'=>$plots,'total'=>$total,'page'=>$page,'page_size'=>60,'offices'=>$offices,
            'office_match'=>'AREA_REFERENCE_ONLY','geometry_notice'=>'মৌজার কেন্দ্রবিন্দু সীমানা নয়। প্রকাশিত উৎসসহ নকশা ছাড়া দাগের সীমানা দেখানো হয় না।'];
    }

    public static function layers(array $query, bool $admin=false, ?array $actor=null): array
    {
        if ($admin) RoleMiddleware::authorize(['admin','system_admin'],$actor);
        self::migrate();
        $where=$admin?' WHERE 1=1':" WHERE status='PUBLISHED'"; $bind=[];
        if (!empty($query['location_id'])) { $where.=' AND location_id=?';$bind[]=(int)$query['location_id']; }
        $rows=DB::select('SELECT id,title,location_id,layer_kind,source_url,rights_note,observed_at,sha256,feature_count,status,created_by,reviewed_by,review_note,created_at,updated_at FROM map_datasets'.$where.' ORDER BY id DESC LIMIT 100',$bind);
        return ['items'=>$rows,'limit'=>100];
    }

    public static function geometry(int $id, bool $admin=false, ?array $actor=null): array
    {
        if ($admin) RoleMiddleware::authorize(['admin','system_admin'],$actor);
        self::migrate();
        $row=DB::selectOne('SELECT * FROM map_datasets WHERE id=?'.($admin?'':" AND status='PUBLISHED'"),[$id]);
        if (!$row) self::fail('MAP_NOT_FOUND','প্রকাশিত নকশা পাওয়া যায়নি।',404);
        return ['id'=>$id,'geojson'=>json_decode($row['geojson'],true),'sha256'=>$row['sha256'],'source_url'=>$row['source_url'],'status'=>$row['status']];
    }

    public static function import(array $body, ?array $actor=null): array
    {
        $u=RoleMiddleware::authorize(['admin','system_admin'],$actor); self::migrate();
        $title=trim((string)($body['title']??'')); $url=trim((string)($body['source_url']??''));$rights=trim((string)($body['rights_note']??''));
        $loc=(int)($body['location_id']??0);$kind=(string)($body['layer_kind']??'cadastre');$date=(string)($body['observed_at']??'');
        if ($title===''||mb_strlen($title)>160||strlen($rights)<12||strlen($rights)>1500) self::fail('SOURCE_REQUIRED','নাম ও ব্যবহারের অধিকার/উৎস সম্পর্কে বিস্তারিত দিন।');
        if (!filter_var($url,FILTER_VALIDATE_URL)||parse_url($url,PHP_URL_SCHEME)!=='https'||strlen($url)>1000) self::fail('INVALID_SOURCE','HTTPS উৎসের ঠিকানা দিন।');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/',$date)||!checkdate((int)substr($date,5,2),(int)substr($date,8,2),(int)substr($date,0,4))||$date>gmdate('Y-m-d')) self::fail('INVALID_DATE','উৎসের সঠিক তারিখ দিন।');
        if (!in_array($kind,['cadastre','land_use','zoning'],true)) self::fail('INVALID_LAYER','নকশার ধরন নির্বাচন করুন।');
        if (!DB::selectOne('SELECT id FROM locations WHERE id=?',[$loc])) self::fail('INVALID_LOCATION','নিবন্ধিত মৌজা নির্বাচন করুন।');
        $g=$body['geojson']??null;
        if (!is_array($g)||($g['type']??'')!=='FeatureCollection'||!is_array($g['features']??null)||count($g['features'])<1||count($g['features'])>1000||isset($g['crs'])) self::fail('INVALID_GEOJSON','WGS84 GeoJSON FeatureCollection দিন (১–১০০০ feature; CRS পুনঃপ্রক্ষেপণ আগে সম্পন্ন করুন)।');
        if (strlen(json_encode($g))>2000000) self::fail('MAP_TOO_LARGE','সর্বোচ্চ ২ মেগাবাইটের নকশা দিন।');
        $clean=[];$vertices=0;
        foreach($g['features'] as $f) {
            $geom=$f['geometry']??[]; $type=$geom['type']??'';$coords=$geom['coordinates']??null;
            if (($f['type']??'')!=='Feature'||!in_array($type,['Point','LineString','Polygon','MultiPolygon'],true)||!is_array($coords)) self::fail('INVALID_GEOMETRY','Point, LineString, Polygon অথবা MultiPolygon দিন।');
            self::validateGeometry($type,$coords,$vertices);
            $properties=[]; $input=$f['properties']??[];
            if(!is_array($input)) self::fail('INVALID_PROPERTIES','Feature properties অবজেক্ট দিন।');
            foreach(['dag_no','sheet_no','survey','land_use','zone','label'] as $key) if(isset($input[$key])&&is_scalar($input[$key])) $properties[$key]=mb_substr(strip_tags((string)$input[$key]),0,160);
            if(isset($input['plot_id'])) {
                $plot=DB::selectOne('SELECT id,dag_no FROM plots WHERE id=? AND location_id=?',[(int)$input['plot_id'],$loc]);
                if(!$plot) self::fail('PLOT_LOCATION_MISMATCH','নকশার দাগ এই মৌজার রেকর্ডের সঙ্গে মেলেনি।');
                if(isset($properties['dag_no'])&&(string)$properties['dag_no']!==(string)$plot['dag_no']) self::fail('DAG_MISMATCH','দাগ নম্বর ও প্লটের পরিচিতি এক নয়।');
                $properties['plot_id']=(int)$plot['id']; $properties['dag_no']=(string)$plot['dag_no'];
            }
            $clean[]=['type'=>'Feature','geometry'=>['type'=>$type,'coordinates'=>$coords],'properties'=>$properties];
        }
        $json=json_encode(['type'=>'FeatureCollection','features'=>$clean],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);$hash=hash('sha256',$json);
        if(DB::selectOne("SELECT id FROM map_datasets WHERE sha256=? AND location_id=? AND status<>'ARCHIVED'",[$hash,$loc])) self::fail('DUPLICATE_MAP','এই নকশা ইতিমধ্যে আমদানি করা আছে।',409);
        return DB::transaction(static function()use($title,$loc,$kind,$url,$rights,$date,$json,$hash,$clean,$u){
            $now=gmdate('c');$id=DB::insert('INSERT INTO map_datasets(title,location_id,layer_kind,source_url,rights_note,observed_at,geojson,sha256,feature_count,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,\'DRAFT\',?,?,?)',[$title,$loc,$kind,$url,$rights,$date,$json,$hash,count($clean),$u['username'],$now,$now]);
            DatabaseSeeder::appendAuditEntry($u['username'],$u['role'],'MAP_IMPORTED','map_dataset',(string)$id,['sha256'=>$hash,'feature_count'=>count($clean)],$now);
            return ['id'=>$id,'status'=>'DRAFT','feature_count'=>count($clean),'sha256'=>$hash];
        });
    }

    private static function validateGeometry(string $type,array $c,int &$vertices): void
    {
        $point=static function($p)use(&$vertices){
            if(!is_array($p)||count($p)!==2||!(is_int($p[0])||is_float($p[0]))||!(is_int($p[1])||is_float($p[1]))||!is_finite((float)$p[0])||!is_finite((float)$p[1])||$p[0]<88||$p[0]>93||$p[1]<20||$p[1]>27||++$vertices>50000) self::fail('INVALID_COORDINATES','বাংলাদেশ অঞ্চলের WGS84 longitude,latitude দিন; সর্বোচ্চ ৫০,০০০ vertex।');
        };
        $ring=static function($r)use($point){if(!is_array($r)||count($r)<4||$r[0]!==$r[count($r)-1]) self::fail('OPEN_RING','Polygon-এর ring বন্ধ এবং অন্তত ৪টি point হতে হবে।');foreach($r as $p)$point($p);};
        if($type==='Point'){$point($c);return;}
        if($type==='LineString'){if(count($c)<2)self::fail('INVALID_LINE','LineString-এ অন্তত ২টি point দিন।');foreach($c as $p)$point($p);return;}
        $polygons=$type==='Polygon'?[$c]:$c;
        if(count($polygons)<1)self::fail('EMPTY_GEOMETRY','খালি geometry গ্রহণযোগ্য নয়।');
        foreach($polygons as $poly){if(!is_array($poly)||count($poly)<1)self::fail('EMPTY_POLYGON','খালি polygon গ্রহণযোগ্য নয়।');foreach($poly as $r)$ring($r);}
    }

    public static function transition(int $id,array $body,?array $actor=null): array
    {
        $u=RoleMiddleware::authorize(['admin','system_admin'],$actor);self::migrate();
        $status=(string)($body['status']??'');$reason=trim((string)($body['reason']??''));
        if(!in_array($status,['PUBLISHED','ARCHIVED'],true)||mb_strlen($reason)<12) self::fail('REVIEW_REQUIRED','সিদ্ধান্তের বিস্তারিত কারণ দিন (অন্তত ১২ অক্ষর)।');
        if($status==='PUBLISHED'&&($body['rights_confirmed']??false)!==true) self::fail('RIGHTS_REVIEW_REQUIRED','উৎস, প্রকাশের অধিকার ও সঠিক অবস্থান পর্যালোচনা নিশ্চিত করুন।');
        return DB::transaction(static function()use($id,$status,$reason,$u){
            $r=DB::selectOne('SELECT status,sha256 FROM map_datasets WHERE id=?',[$id]);if(!$r)self::fail('MAP_NOT_FOUND','নকশা পাওয়া যায়নি।',404);
            if(($status==='PUBLISHED'&&$r['status']!=='DRAFT')||($status==='ARCHIVED'&&$r['status']!=='PUBLISHED'))self::fail('MAP_STATE_CONFLICT','নকশার অবস্থা বদলেছে। আবার তালিকা খুলুন।',409);
            $now=gmdate('c');$stmt=DB::connection()->prepare('UPDATE map_datasets SET status=?,reviewed_by=?,review_note=?,updated_at=? WHERE id=? AND status=?');$stmt->execute([$status,$u['username'],$reason,$now,$id,$r['status']]);
            if($stmt->rowCount()!==1)self::fail('MAP_STATE_CONFLICT','অন্য কর্মকর্তা সিদ্ধান্ত দিয়েছেন।',409);
            DatabaseSeeder::appendAuditEntry($u['username'],$u['role'],'MAP_'.$status,'map_dataset',(string)$id,['sha256'=>$r['sha256'],'reason'=>$reason],$now);return ['id'=>$id,'status'=>$status];
        });
    }
}
