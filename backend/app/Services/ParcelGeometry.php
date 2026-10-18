<?php
declare(strict_types=1);
namespace App\Services;
/** Small, bounded, single-ring WGS84 editor geometry; not survey certification. */
final class ParcelGeometry {
 public static function error(string $code,string $message):never {throw new \RuntimeException(json_encode(['status'=>422,'code'=>$code,'message_bn'=>$message,'message_en'=>$message],JSON_UNESCAPED_UNICODE));}
 private static function cross(array $a,array $b,array $c):float{return ($b[0]-$a[0])*($c[1]-$a[1])-($b[1]-$a[1])*($c[0]-$a[0]);}
 private static function on(array $p,array $a,array $b):bool{return abs(self::cross($a,$b,$p))<1e-12&&$p[0]>=min($a[0],$b[0])-1e-10&&$p[0]<=max($a[0],$b[0])+1e-10&&$p[1]>=min($a[1],$b[1])-1e-10&&$p[1]<=max($a[1],$b[1])+1e-10;}
 private static function proper(array $a,array $b,array $c,array $d):bool{return self::cross($a,$b,$c)*self::cross($a,$b,$d)<-1e-24&&self::cross($c,$d,$a)*self::cross($c,$d,$b)<-1e-24;}
 private static function inside(array $p,array $r):bool{$in=false;for($i=0,$j=count($r)-2;$i<count($r)-1;$j=$i++){if(self::on($p,$r[$j],$r[$i]))return false;if(($r[$i][1]>$p[1])!==($r[$j][1]>$p[1])&&$p[0]<($r[$j][0]-$r[$i][0])*($p[1]-$r[$i][1])/($r[$j][1]-$r[$i][1])+$r[$i][0])$in=!$in;}return $in;}
 public static function validate(mixed $g):array {
  if(!is_array($g)||($g['type']??'')!=='Polygon'||!is_array($g['coordinates']??null)||count($g['coordinates'])!==1)self::error('SINGLE_POLYGON_REQUIRED','একটি দাগের জন্য একটি বন্ধ সীমানা আঁকুন; hole সমর্থিত নয়।');
  $r=$g['coordinates'][0];if(!is_array($r)||!array_is_list($r)||count($r)<4||count($r)>201||$r[0]!==$r[count($r)-1])self::error('INVALID_RING','৩–২০০টি কোণ দিয়ে বন্ধ সীমানা তৈরি করুন।');
  foreach($r as $p)if(!is_array($p)||!array_is_list($p)||count($p)!==2||!(is_int($p[0])||is_float($p[0]))||!(is_int($p[1])||is_float($p[1]))||!is_finite((float)$p[0])||!is_finite((float)$p[1])||$p[0]<88||$p[0]>93||$p[1]<20||$p[1]>27)self::error('INVALID_COORDINATES','বাংলাদেশের WGS84 অবস্থান প্রয়োজন।');
  $n=count($r)-1;$sum=0;
  for($i=0;$i<$n;$i++){
   if($r[$i]===$r[$i+1])self::error('DUPLICATE_VERTEX','একই কোণ পরপর দুইবার দেওয়া যাবে না।');
   $sum+=$r[$i][0]*$r[$i+1][1]-$r[$i+1][0]*$r[$i][1];
   for($j=$i+1;$j<$n;$j++){if($j===$i+1||($i===0&&$j===$n-1))continue;
    if(self::proper($r[$i],$r[$i+1],$r[$j],$r[$j+1])||self::on($r[$i],$r[$j],$r[$j+1])||self::on($r[$j],$r[$i],$r[$i+1]))self::error('SELF_INTERSECTION','দাগের সীমানা নিজেকে ছেদ করছে। কোণ সরিয়ে ঠিক করুন।');
   }
  }
  if(abs($sum)<1e-12)self::error('ZERO_AREA','দাগের আয়তন শূন্য বা অত্যন্ত ছোট।');
  // Local equirectangular area, suitable only for editor estimates over small parcels.
  $lat=array_sum(array_column(array_slice($r,0,-1),1))/$n;$area=abs($sum)/2*pow(M_PI/180*6371008.8,2)*cos(deg2rad($lat));
  return ['geometry'=>['type'=>'Polygon','coordinates'=>[$r]],'area_sqm'=>$area,'area_decimal'=>$area/40.468564224,'bbox'=>[min(array_column($r,0)),min(array_column($r,1)),max(array_column($r,0)),max(array_column($r,1))]];
 }
 public static function overlaps(array $a,array $b):bool {
  $a=$a['coordinates'][0];$b=$b['coordinates'][0];
  foreach([$a,$b] as $index=>$r){$other=$index===0?$b:$a;
   for($i=0;$i<count($r)-1;$i++){
    if(self::inside($r[$i],$other))return true;
    $mid=[($r[$i][0]+$r[$i+1][0])/2,($r[$i][1]+$r[$i+1][1])/2];if(self::inside($mid,$other))return true;
    for($j=0;$j<count($other)-1;$j++)if(self::proper($r[$i],$r[$i+1],$other[$j],$other[$j+1]))return true;
    // Interior-side probes detect coincident boundaries; shared adjacent edges stay valid.
    $dx=$r[$i+1][0]-$r[$i][0];$dy=$r[$i+1][1]-$r[$i][1];$len=hypot($dx,$dy);if($len>0)foreach([-1,1] as $sign){$p=[$mid[0]-$sign*$dy/$len*1e-8,$mid[1]+$sign*$dx/$len*1e-8];if(self::inside($p,$r)&&self::inside($p,$other))return true;}
   }
  }return false;
 }
}
