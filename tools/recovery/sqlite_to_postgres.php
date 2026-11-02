<?php
declare(strict_types=1);
/** Explicit one-shot recovery into a NEW EMPTY PostgreSQL database. Never drops/reseeds a target. */
if (PHP_SAPI !== 'cli') exit(2);
$o = getopt('', ['source:', 'pg-config:', 'report:', 'apply']);
if (!isset($o['source'], $o['pg-config'], $o['report'], $o['apply'])) {
    fwrite(STDERR, "Required: --source=<SQLite snapshot> --pg-config=<private JSON> --report=<JSON output> --apply\n"); exit(2);
}
function ident(string $v): string {
    if (!preg_match('/^[a-z][a-z0-9_]*$/D', $v)) throw new RuntimeException('Unexpected SQL identifier.');
    return '"'.$v.'"';
}
function tableDigest(PDO $db, string $table, array $columns): array {
    $rows=$db->query('SELECT * FROM '.ident($table))->fetchAll(PDO::FETCH_ASSOC); $hashes=[];
    foreach ($rows as $row) {
        $values=[];
        foreach ($columns as $col) {
            $name=$col['name'];$lookup=$table==='map_parcel_designs'&&$db->getAttribute(PDO::ATTR_DRIVER_NAME)==='pgsql'&&in_array($name,['xmin','xmax'],true)?'bbox_'.$name:$name;
            $v=$row[$lookup];
            $values[]=$v===null?null:(strtoupper($col['type'])==='REAL'?sprintf('%.17g',(float)$v):(string)$v);
        }
        $hashes[]=hash('sha256',json_encode($values,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR));
    }
    sort($hashes,SORT_STRING);
    return ['rows'=>count($rows),'sha256'=>hash('sha256',implode("\n",$hashes))];
}
$target=null;
try {
    if (!is_file($o['source']) || !is_file($o['pg-config'])) throw new RuntimeException('Source snapshot or private configuration is missing.');
    $source=new PDO('sqlite:'.$o['source'],null,null,[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $source->exec('PRAGMA query_only=ON');
    if ($source->query('PRAGMA integrity_check')->fetchColumn()!=='ok' || $source->query('PRAGMA foreign_key_check')->fetch()) throw new RuntimeException('Source integrity or foreign keys failed.');
    if ((int)$source->query('SELECT is_authorized FROM ownership_write_lock WHERE id=1')->fetchColumn()!==0) throw new RuntimeException('Source snapshot contains an active ownership write context.');
    $cfg=json_decode(file_get_contents($o['pg-config']),true,512,JSON_THROW_ON_ERROR);
    $host=(string)$cfg['host']; $local=str_starts_with($host,'/');
    if (!$local && ($cfg['sslmode']??'')!=='verify-full') throw new RuntimeException('Remote recovery requires certificate-verified TLS.');
    $dsn='pgsql:host='.$host.';port='.(int)($cfg['port']??5432).';dbname='.$cfg['database'].';sslmode='.($local?'disable':'verify-full').';connect_timeout=15';
    if (!$local) $dsn.=';sslrootcert=system';
    $target=new PDO($dsn,$cfg['user'],$cfg['password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    if ((int)$target->query("SELECT COUNT(*) FROM pg_tables WHERE schemaname='public'")->fetchColumn()!==0) throw new RuntimeException('Target is not empty. No rows were replaced or deleted.');
    $tables=$source->query("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_KEY_PAIR);
    $pending=array_keys($tables); $ordered=[];
    while ($pending) {
        $ready=[];
        foreach ($pending as $name) {
            $deps=array_column($source->query('PRAGMA foreign_key_list('.ident($name).')')->fetchAll(PDO::FETCH_ASSOC),'table');
            if (!array_intersect(array_diff($deps,[$name]),$pending)) $ready[]=$name;
        }
        if (!$ready) throw new RuntimeException('Foreign-key dependency cycle requires explicit review.');
        $ordered=array_merge($ordered,$ready); $pending=array_values(array_diff($pending,$ready));
    }
    $target->beginTransaction(); $report=['source_sha256'=>hash_file('sha256',$o['source']),'tables'=>[]];
    foreach ($ordered as $name) {
        $ddl=preg_replace('/\bINTEGER PRIMARY KEY AUTOINCREMENT\b/i','BIGSERIAL PRIMARY KEY',$tables[$name]);
        $ddl=preg_replace('/\bREAL\b/i','DOUBLE PRECISION',$ddl);
        if ($name==='map_parcel_designs') $ddl=preg_replace('/\b(xmin|xmax)\b/','bbox_$1',$ddl);
        $target->exec($ddl);
        $columns=$source->query('PRAGMA table_info('.ident($name).')')->fetchAll(PDO::FETCH_ASSOC);
        $names=array_column($columns,'name');
        $targetNames=array_map(static fn($col)=>$name==='map_parcel_designs'&&in_array($col,['xmin','xmax'],true)?'bbox_'.$col:$col,$names);
        $stmt=$target->prepare('INSERT INTO '.ident($name).' ('.implode(',',array_map('ident',$targetNames)).') VALUES ('.implode(',',array_fill(0,count($names),'?')).')');
        foreach ($source->query('SELECT * FROM '.ident($name)) as $row) {
            $values=[];
            foreach ($columns as $col) {$v=$row[$col['name']];$values[]=$v!==null&&strtoupper($col['type'])==='REAL'?sprintf('%.17g',(float)$v):$v;}
            $stmt->execute($values);
        }
        if (in_array('id',$names,true)) {
            $seq=$target->query("SELECT pg_get_serial_sequence('".$name."','id')")->fetchColumn();
            if ($seq) {
                $max=(int)$target->query('SELECT COALESCE(MAX(id),0) FROM '.ident($name))->fetchColumn();
                $target->prepare('SELECT setval(?::regclass,?::bigint,?::boolean)')->execute([$seq,max(1,$max),$max>0?'true':'false']);
            }
        }
        $before=tableDigest($source,$name,$columns);$after=tableDigest($target,$name,$columns);
        if ($before!==$after) throw new RuntimeException('Preservation check failed for '.$name.'. Transaction will roll back.');
        $report['tables'][$name]=$after;
    }
    foreach ($source->query("SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL ORDER BY name") as $idx) {$sql=$idx['sql'];if(str_contains($sql,'map_parcel_designs'))$sql=preg_replace('/\b(xmin|xmax)\b/','bbox_$1',$sql);$target->exec($sql);}
    $target->exec(<<<'SQL'
CREATE OR REPLACE FUNCTION bhumi_guard_ownership_write() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF COALESCE((SELECT is_authorized FROM ownership_write_lock WHERE id=1),0) <> 1 THEN
  RAISE EXCEPTION 'VIOLATION_M3_OWNERSHIP_GUARD: Ownership writes require an authorized mutation context.';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_ownership_write BEFORE INSERT OR UPDATE OR DELETE ON ownerships
FOR EACH ROW EXECUTE FUNCTION bhumi_guard_ownership_write();
SQL);
    $report['total_rows']=array_sum(array_column($report['tables'],'rows'));$report['table_count']=count($report['tables']);$report['preserved']=true;
    // A failed report write must not leave a database whose preservation result was lost.
    if (file_put_contents($o['report'],json_encode($report,JSON_PRETTY_PRINT|JSON_THROW_ON_ERROR))===false) throw new RuntimeException('Cannot write preservation report.');
    chmod($o['report'],0600);$target->commit();
    echo json_encode(['tables'=>$report['table_count'],'rows'=>$report['total_rows'],'preservation'=>'all counts and normalized row hashes match'])."\n";
} catch (Throwable $e) {
    if ($target && $target->inTransaction()) $target->rollBack();
    // Connection errors can contain endpoint metadata, but never print credentials or data values.
    fwrite(STDERR,'Recovery stopped: '.$e->getMessage()."\n");exit(1);
}
