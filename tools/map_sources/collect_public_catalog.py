#!/usr/bin/env python3
"""Collect a small public source catalogue, never parcel/owner data or map tiles.
No login, CSRF token replay, private API, CAPTCHA bypass, recursive crawl or bulk download.
"""
import argparse, datetime, hashlib, html.parser, json, pathlib, re, time
import urllib.request, urllib.parse, urllib.robotparser

ORIGIN = 'https://map.land.gov.bd'
AGENT = 'BhumiShieldSourceCatalog/1.0'
MAX_BYTES = 2_000_000
class SameOriginRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(newurl).netloc != 'map.land.gov.bd' or not newurl.startswith('https://'):
            raise ValueError('Cross-origin or insecure redirect refused')
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def get(url):
    if urllib.parse.urlparse(url).netloc != 'map.land.gov.bd' or not url.startswith('https://'):
        raise ValueError('Only this public HTTPS source is allowed')
    with urllib.request.build_opener(SameOriginRedirect()).open(urllib.request.Request(url, headers={'User-Agent': AGENT}), timeout=25) as response:
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES: raise ValueError('Response exceeds size budget')
        return body

class CatalogueParser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.select_ids=[]; self.links=[]; self.in_title=False; self.title=''
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='title': self.in_title=True
        if tag=='select' and a.get('id'): self.select_ids.append(a['id'])
        if tag=='a' and a.get('href','').startswith('https://'):
            u=a['href']; host=urllib.parse.urlparse(u).hostname or ''
            if host.endswith('.gov.bd'): self.links.append(u)
    def handle_endtag(self, tag):
        if tag=='title': self.in_title=False
    def handle_data(self, data):
        if self.in_title: self.title+=data

def collect(output, cache):
    robots=get(ORIGIN+'/robots.txt').decode('utf-8','replace')
    policy=urllib.robotparser.RobotFileParser(); policy.parse(robots.splitlines())
    if not policy.can_fetch(AGENT, ORIGIN+'/'): raise ValueError('robots.txt does not allow this fetch')
    delay=max(2, policy.crawl_delay(AGENT) or 0); time.sleep(min(delay,60))
    raw=get(ORIGIN+'/'); page=raw.decode('utf-8','replace'); parser=CatalogueParser();parser.feed(page)
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat(); digest=hashlib.sha256(raw).hexdigest()
    previous=json.loads(output.read_text()) if output.exists() else {}
    result={'schema_version':1,'source_url':ORIGIN+'/','title':parser.title.strip(),'collected_at':stamp,'sha256':digest,
        'changed_since_previous':bool(previous and previous.get('sha256')!=digest),'previous_sha256':previous.get('sha256'),
        'robots_allowed':True,'robots_sha256':hashlib.sha256(robots.encode()).hexdigest(),
        'visible_selectors':parser.select_ids,'official_service_links':sorted(set(parser.links)),
        'capabilities':[x for x in ['ভূমি ব্যবহারের সারাংশ','ভূমি জোনিং সারাংশ'] if x in page],
        'data_scope':'Public page catalogue only; no cadastral geometry, ownership records or reuse licence inferred.',
        'reuse_status':'REQUIRES_SOURCE_AND_RIGHTS_REVIEW','fetch_count':2}
    cache.mkdir(parents=True,exist_ok=True);(cache/(digest+'.html')).write_bytes(raw)
    output.parent.mkdir(parents=True,exist_ok=True);temporary=output.with_suffix('.tmp');temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2));temporary.replace(output)
    print(json.dumps({'output':str(output),'sha256':digest,'changed':result['changed_since_previous'],'scope':result['data_scope']},ensure_ascii=False))

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--output',type=pathlib.Path,required=True);ap.add_argument('--cache',type=pathlib.Path,required=True);args=ap.parse_args()
    try:collect(args.output,args.cache)
    except Exception as exc:raise SystemExit('Source collection stopped (no bypass/retries): '+str(exc))
