import importlib.util,json,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('collector',Path(__file__).with_name('collector.py'));c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
class Tests(unittest.TestCase):
 def test_url_boundary(self):
  for url in ['http://minland.gov.bd/','https://minland.gov.bd.evil.test/','https://a.gov.bd@127.0.0.1/','https://land.gov.bd:444/','https://land.gov.bd/api/v1/','https://land.gov.bd/login','https://land.gov.bd/?nid=1','https://localhost/']:
   with self.subTest(url=url),self.assertRaises(ValueError):c.official_url(url)
  self.assertEqual(c.official_url('https://minland.gov.bd/pages/notices').hostname,'minland.gov.bd')
 def test_private_dns(self):
  for ip in ['127.0.0.1','169.254.169.254','10.0.0.1','::1']:
   with patch.object(c.socket,'getaddrinfo',return_value=[(2,1,6,'',(ip,443))]),self.assertRaises(ValueError):c.PublicHTTPS('land.gov.bd').connect()
 def test_notice_rows_and_no_navigation(self):
  source={'kind':'NOTICE','title_bn':'নোটিশ'}
  raw='<title>নোটিশ</title><nav><a href="/pages/notices/menu">Menu link</a></nav><table><tr><td>মৌজা জরিপের নোটিশ</td><td>17-10-2026</td><td><a href="/pages/notices/123">দেখুন</a></td></tr></table>'
  items,_=c.parse_page(source,raw.encode(),'https://minland.gov.bd/pages/notices')
  self.assertEqual(len(items),2);self.assertIn('মৌজা জরিপের নোটিশ',items[1]['title']);self.assertFalse(any('Menu link' in i['title'] for i in items))
 def test_semantic_change_not_csrf(self):
  source={'kind':'MAP','title_bn':'ম্যাপ'};url='https://map.land.gov.bd/'
  a=c.parse_page(source,b'<title>Map</title><input value="a"><a href="https://dlrs.gov.bd/maps">map source</a>',url)
  b=c.parse_page(source,b'<title>Map</title><input value="b"><a href="https://dlrs.gov.bd/maps">map source</a>',url)
  self.assertEqual(a[1],b[1])
 def test_external_script_ignored(self):
  source={'kind':'MAP','title_bn':'ম্যাপ'}
  i,_=c.parse_page(source,b'<title>Map</title><script>SECRET</script><a href="https://evil.test/map">map private</a>','https://map.land.gov.bd/')
  self.assertEqual(len(i),1);self.assertNotIn('SECRET',i[0]['excerpt'])
 def test_bounded_items_and_text(self):
  text='<title>Map</title>'+('a '*1000)+''.join('<a href="https://land.gov.bd/map/'+str(i)+'">map '+str(i)+'</a>' for i in range(200))
  i,_=c.parse_page({'kind':'MAP'},text.encode(),'https://map.land.gov.bd/');self.assertEqual(len(i),31);self.assertLessEqual(len(i[0]['excerpt']),600)
 def test_robots_denial_and_outage(self):
  for status,body in [(200,b'User-agent: *\nDisallow: /'),(503,b'error')]:
   f=c.Fetcher();f.raw=lambda *args:(status,body,'text/plain','https://land.gov.bd/robots.txt')
   with self.assertRaises(ValueError):f.page('https://land.gov.bd/')
 def test_unicode_notice_url_is_encoded(self):
  raw='<title>নোটিশ</title><table><tr><td>জরিপের নোটিশ</td><td><a href="/pages/notices/জরিপ">দেখুন</a></td></tr></table>'
  i,_=c.parse_page({'kind':'NOTICE'},raw.encode(),'https://minland.gov.bd/pages/notices')
  self.assertTrue(i[1]['source_url'].isascii());self.assertIn('%',i[1]['source_url'])
 def test_circular_rows_without_government_hosted_pdf(self):
  raw='<title>Circulars</title><table><tr><td>৭২</td><td>ভূমি নামজারি ও ফি সংক্রান্ত নতুন পরিপত্রের তথ্য</td><td><a href="https://cdn.example.test/file.pdf">PDF</a></td></tr></table>'
  i,_=c.parse_page({'kind':'CIRCULAR'},raw.encode(),'https://minland.gov.bd/circulars')
  self.assertEqual(i[1]['item_key'],'row-৭২');self.assertEqual(i[1]['source_url'],'https://minland.gov.bd/circulars')
 def test_link_health_checks_configured_service_only(self):
  class Fake:
   count=2
   def page(self,url):return b'<title>Service</title><a href="https://other.gov.bd/map">map</a>',url
  f=Fake();r=c.collect({'key':'service','kind':'LINK','title_bn':'Service','url':'https://land.gov.bd/service'},f)
  self.assertEqual(len(r['items']),1);self.assertEqual(r['items'][0]['source_url'],'https://land.gov.bd/service');self.assertEqual(r['items'][0]['health'],'REACHABLE')
 def test_fetch_envelope(self):
  class Fake:
   count=2
   def page(self,url):return b'<title>Official map</title>',url
  r=c.collect({'key':'maps','kind':'MAP','title_bn':'Maps','url':'https://dlrs.gov.bd/maps'},Fake())
  self.assertEqual(r['source_key'],'maps');self.assertEqual(len(r['raw_sha256']),64)
class CollectionPolicyTests(unittest.TestCase):
 def test_disabled_policy_stops_before_network(self):
  with patch.object(c,'require_collection_enabled',side_effect=ValueError('OFF')),patch.object(c,'PublicHTTPS') as connection:
   with self.assertRaises(ValueError):c.Fetcher().raw('https://land.gov.bd/')
   connection.assert_not_called()
 def test_policy_accepts_only_verified_true(self):
  import collection_policy as policy
  from types import SimpleNamespace
  with patch.object(policy.shutil,'which',return_value='/synthetic/php'),patch.object(policy.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout='true')):
   policy.require_collection_enabled()
 def test_policy_fails_closed_on_false_invalid_and_process_failure(self):
  import collection_policy as policy
  from types import SimpleNamespace
  for code,output in [(0,'false'),(0,'garbage'),(1,'true')]:
   with self.subTest(code=code,output=output),patch.object(policy.shutil,'which',return_value='/synthetic/php'),patch.object(policy.subprocess,'run',return_value=SimpleNamespace(returncode=code,stdout=output)),self.assertRaises(ValueError):policy.require_collection_enabled()
 def test_policy_fails_closed_on_timeout(self):
  import collection_policy as policy
  with patch.object(policy.shutil,'which',return_value='/synthetic/php'),patch.object(policy.subprocess,'run',side_effect=policy.subprocess.TimeoutExpired('php',10)),self.assertRaises(ValueError):policy.require_collection_enabled()
if __name__=='__main__':unittest.main()
