<?php
declare(strict_types=1);
namespace App\Http\Controllers\Api\V1;
use App\Http\Middleware\RoleMiddleware;
use App\Support\DB;
use Database\Seeders\DatabaseSeeder;
final class ContentWorkflowController {
 private static function fail(int $status,string $code,string $en):never{throw new \RuntimeException(json_encode(['status'=>$status,'code'=>$code,'message_bn'=>'প্রকাশনার তথ্য ও অনুমতি যাচাই করুন।','message_en'=>$en],JSON_UNESCAPED_UNICODE));}
 private static function table(string $kind):string{return match($kind){'blog'=>'blog_posts','notice'=>'notices',default=>self::fail(422,'INVALID_CONTENT_KIND','Choose a guide or notice.')};}
 public static function listing(array $query):array {
  $u=RoleMiddleware::authorize(['content_editor','content_approver','platform_moderator','admin','system_admin']);
  if(($u['role']??'')==='platform_moderator')return ['items'=>DB::select('SELECT l.id,l.listing_code,l.description_en,l.description_bn,l.status,l.asking_price_bdt,p.dag_no FROM listings l JOIN plots p ON p.id=l.plot_id ORDER BY l.id DESC'),'kind'=>'listing'];
  $kind=(string)($query['kind']??'blog');$table=self::table($kind);$rows=DB::select("SELECT * FROM {$table} ORDER BY id DESC");if($u['role']==='content_editor')$rows=array_values(array_filter($rows,fn($r)=>(int)($r['created_by_user_id']??0)===(int)$u['id']));return ['items'=>$rows,'kind'=>$kind];
 }
 public static function save(array $body,?int $id=null):array {
  $u=RoleMiddleware::authorize(['content_editor','admin','system_admin']);$kind=(string)($body['kind']??'blog');$table=self::table($kind);$fields=[];foreach(['title_bn','title_en','body_bn','body_en'] as $f){$fields[$f]=trim((string)($body[$f]??''));if(strlen($fields[$f])<3)self::fail(422,'CONTENT_REQUIRED','Provide titles and body text in both languages.');}
  return DB::transaction(function()use($id,$u,$kind,$table,$fields){$now=gmdate('c');if($id){$old=DB::selectOne("SELECT * FROM {$table} WHERE id=?",[$id]);if(!$old)self::fail(404,'CONTENT_NOT_FOUND','Draft not found.');if((int)$old['created_by_user_id']!==(int)$u['id']||!in_array($old['status'],['DRAFT','REJECTED'],true))self::fail(403,'DRAFT_OWNER_REQUIRED','Only the author can edit their draft or rejected item.');DB::statement("UPDATE {$table} SET title_bn=?,title_en=?,body_bn=?,body_en=?,status='DRAFT' WHERE id=?",[...array_values($fields),$id]);}
   elseif($kind==='blog'){if(!DB::selectOne("SELECT slug FROM blog_categories WHERE slug='guidance'"))DB::insert("INSERT INTO blog_categories(slug,name_bn,name_en) VALUES('guidance','নির্দেশিকা','Guidance')");$id=DB::insert('INSERT INTO blog_posts(post_slug,category_slug,title_bn,title_en,body_bn,body_en,author_name_bn,author_name_en,reading_time_minutes,status,published_at,created_at,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',['guide-'.bin2hex(random_bytes(6)),'guidance',...array_values($fields),$u['full_name_bn'],$u['full_name_en'],max(1,(int)ceil(str_word_count($fields['body_en'])/200)),'DRAFT',$now,$now,$u['id']]);}
   else{$id=DB::insert('INSERT INTO notices(notice_slug,category,scope,title_bn,title_en,body_bn,body_en,status,created_at,updated_at,created_by_user_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)',['notice-'.bin2hex(random_bytes(6)),'COMMUNITY','PLATFORM',...array_values($fields),'DRAFT',$now,$now,$u['id']]);}DatabaseSeeder::appendAuditEntry($u['username'],$u['role'],'CONTENT_DRAFT_SAVED',$kind,(string)$id,[],$now);return DB::selectOne("SELECT * FROM {$table} WHERE id=?",[$id]);});
 }
 public static function transition(int $id,array $body):array {
  $u=RoleMiddleware::authorize(['content_editor','content_approver','platform_moderator','admin','system_admin']);$kind=(string)($body['kind']??'blog');$decision=strtoupper((string)($body['status']??''));
  if($kind==='listing'){if(!in_array($u['role'],['platform_moderator','admin','system_admin'],true)||!in_array($decision,['ACTIVE','SUSPENDED'],true))self::fail(403,'MODERATOR_REQUIRED','Only a moderator can change listing visibility.');if(!DB::selectOne('SELECT id FROM listings WHERE id=?',[$id]))self::fail(404,'LISTING_NOT_FOUND','Listing not found.');DB::statement('UPDATE listings SET status=?,updated_at=? WHERE id=?',[$decision,gmdate('c'),$id]);DatabaseSeeder::appendAuditEntry($u['username'],$u['role'],'LISTING_VISIBILITY_CHANGED','listing',(string)$id,['status'=>$decision],gmdate('c'));return ['id'=>$id,'status'=>$decision];}
  $table=self::table($kind);return DB::transaction(function()use($u,$id,$table,$kind,$decision){$row=DB::selectOne("SELECT * FROM {$table} WHERE id=?",[$id]);if(!$row)self::fail(404,'CONTENT_NOT_FOUND','Content not found.');$maker=(int)($row['created_by_user_id']??0)===(int)$u['id'];
   if($decision==='SUBMITTED'){if(!$maker||!in_array($row['status'],['DRAFT','REJECTED'],true))self::fail(403,'AUTHOR_DRAFT_REQUIRED','Only the author can submit a draft for review.');}
   elseif(in_array($decision,['PUBLISHED','REJECTED'],true)){if(!in_array($u['role'],['content_approver','admin','system_admin'],true)||$maker)self::fail(403,'INDEPENDENT_REVIEW_REQUIRED','A different authorized reviewer must decide publication.');if($row['status']!=='SUBMITTED')self::fail(409,'CONTENT_NOT_SUBMITTED','This item is not waiting for review.');}
   else self::fail(422,'INVALID_STATUS','Choose a valid publication action.');$now=gmdate('c');DB::statement("UPDATE {$table} SET status=?,reviewed_by_user_id=?,published_at=? WHERE id=?",[$decision,$decision==='SUBMITTED'?null:$u['id'],$decision==='PUBLISHED'?$now:$row['published_at'],$id]);DatabaseSeeder::appendAuditEntry($u['username'],$u['role'],'CONTENT_'.$decision,$kind,(string)$id,[],$now);return DB::selectOne("SELECT * FROM {$table} WHERE id=?",[$id]);});
 }
}
