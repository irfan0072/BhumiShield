#!/usr/bin/env python3
"""Bounded public official-source collection. JSON stdin -> JSON stdout.
No login, records search, CAPTCHA bypass, recursive crawling, tiles or private APIs.
Each source is a single page; linked documents are references, not bulk downloads.
"""
import argparse, datetime as dt, hashlib, html.parser, http.client, ipaddress, json
import re, socket, ssl, sys, time, urllib.parse, urllib.robotparser
from pathlib import Path
from collection_policy import require_collection_enabled

AGENT = 'BhumiShieldSourceReview/1.0'
MAX_BYTES = 2_000_000
KINDS = {'CIRCULAR','FEE','OFFICE','GUIDE','MAP','NOTICE','LINK'}

def official_url(url):
    p = urllib.parse.urlsplit(url)
    host = (p.hostname or '').lower()
    if (p.scheme != 'https' or not host.endswith('.gov.bd') or p.username or p.password
        or p.port not in (None,443) or p.query or p.fragment or len(url)>1000):
        raise ValueError('Only public HTTPS .gov.bd pages without credentials/query are allowed')
    if any(x in urllib.parse.unquote(p.path).lower() for x in ['/api/','/login','/admin','/logout','/auth','/search','/account']):
        raise ValueError('Private, API and search routes are excluded')
    return p

class PublicHTTPS(http.client.HTTPSConnection):
    """Pin a validated public IP while retaining certificate and hostname verification."""
    def connect(self):
        infos=socket.getaddrinfo(self.host,443,type=socket.SOCK_STREAM)
        if not infos or any(not ipaddress.ip_address(i[4][0]).is_global for i in infos):
            raise ValueError('Non-public destination refused')
        address=infos[0][4]
        sock=socket.socket(infos[0][0],socket.SOCK_STREAM);sock.settimeout(self.timeout)
        try:
            sock.connect(address)
            self.sock=self._context.wrap_socket(sock,server_hostname=self.host)
        except BaseException:
            sock.close();raise

class Fetcher:
    def __init__(self, deadline=32):
        self.deadline=time.monotonic()+deadline;self.count=0;self.last={};self.policies={}
    def raw(self,url,redirects=0):
        require_collection_enabled()
        p=official_url(url)
        if self.count>=10 or time.monotonic()>self.deadline:raise ValueError('Collection budget exhausted')
        wait=max(0,self.last.get(p.hostname,0)+2-time.monotonic())
        if wait:time.sleep(wait)
        remaining=self.deadline-time.monotonic()
        if remaining<=0:raise ValueError('Collection deadline exhausted')
        conn=PublicHTTPS(p.hostname,timeout=min(8,remaining));self.count+=1;self.last[p.hostname]=time.monotonic()
        try:
            conn.request('GET',p.path or '/',headers={'User-Agent':AGENT,'Accept':'text/html,text/plain;q=0.9','Accept-Encoding':'identity'})
            res=conn.getresponse()
            if res.status in (301,302,303,307,308):
                target=urllib.parse.urljoin(url,res.getheader('Location',''));t=official_url(target)
                if redirects>=2 or t.hostname!=p.hostname:raise ValueError('Cross-origin or excessive redirect refused')
                policy=self.policies.get('https://'+p.hostname)
                if policy and not policy.can_fetch(AGENT,target):raise ValueError('Redirect excluded by robots.txt')
                return self.raw(target,redirects+1)
            body=res.read(MAX_BYTES+1)
            if len(body)>MAX_BYTES:raise ValueError('Response too large')
            return res.status,body,res.getheader('Content-Type',''),url
        finally:conn.close()
    def page(self,url):
        p=official_url(url);origin='https://'+p.hostname
        if origin not in self.policies:
            status,body,_,_=self.raw(origin+'/robots.txt')
            if status==404:policy=urllib.robotparser.RobotFileParser();policy.parse([])
            elif status==200:
                policy=urllib.robotparser.RobotFileParser();policy.parse(body.decode('utf-8','replace').splitlines())
            else:raise ValueError('robots.txt could not be verified')
            self.policies[origin]=policy
        policy=self.policies[origin]
        if not policy.can_fetch(AGENT,url):raise ValueError('robots.txt excludes this page')
        delay=max(2,policy.crawl_delay(AGENT) or 0)
        if delay>10:raise ValueError('Source crawl delay exceeds this run budget')
        self.last[p.hostname]=max(self.last.get(p.hostname,0),time.monotonic()+delay-2)
        status,body,ctype,final=self.raw(url)
        if status!=200:raise ValueError('Official page returned HTTP '+str(status))
        if not any(t in ctype.lower() for t in ('text/html','text/plain','application/xhtml')):raise ValueError('Only public text pages are collected')
        return body,final

class Parser(html.parser.HTMLParser):
    def __init__(self):
        super().__init__();self.depth=0;self.ignored=[];self.title='';self.intitle=False;self.text=[];self.links=[];self.anchor=None;self.row=[];self.inrow=False;self.rows=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ('script','style','nav','footer','header','noscript'):self.ignored.append(tag)
        if self.ignored:return
        if tag=='title':self.intitle=True
        if tag=='tr':self.inrow=True;self.row=[]
        if tag=='a':self.anchor=[a.get('href',''),'']
    def handle_endtag(self,tag):
        if self.ignored:
            if tag==self.ignored[-1]:self.ignored.pop()
            return
        if tag=='title':self.intitle=False
        if tag=='a' and self.anchor:
            self.links.append({'href':self.anchor[0],'label':clean(self.anchor[1]),'row':self.row});self.anchor=None
        if tag=='tr':
            self.rows.append(clean(' '.join(self.row)));self.inrow=False;self.row=[]
    def handle_data(self,data):
        if self.ignored:return
        if self.intitle:self.title+=data
        else:self.text.append(data)
        if self.anchor:self.anchor[1]+=data+' '
        if self.inrow:self.row.append(data)

def clean(text):return re.sub(r'\s+',' ',text).strip()
def parse_page(source,body,final_url):
    parser=Parser();parser.feed(body.decode('utf-8','replace'))
    # Short human-review excerpts, never a full third-party article republication.
    title=clean(parser.title)[:240] or source.get('title_bn','Official source')
    items=[];seen=set()
    text=clean(' '.join(parser.text))
    heading=title.split('|')[0].strip()
    start=text.find(heading)
    if start>=0:text=text[start:]
    if any(v in title.lower() for v in ('just a moment','access denied','captcha')):raise ValueError('Source challenge page; no bypass attempted')
    if source['kind'] in KINDS:
        items.append({'source_url':final_url,'title':title,'excerpt':text[:600]})
    terms={'CIRCULAR':r'পরিপত্র|নামজারি|খতিয়ান|খতিয়ান|ফি|জমি|ভূমি|circular',
           'OFFICE':r'চার্টার|সেবা প্রদান|ঠিকানা|যোগাযোগ|দপ্তর|অফিস|charter',
           'GUIDE':r'নির্দেশিকা|কাগজ|নামজারি|সেবা|manual',
           'MAP':r'ম্যাপ|মানচিত্র|নকশা|মৌজা|জরিপ|map|survey',
           'NOTICE':r'.','FEE':r'ফি|কর|fee|পরিপত্র','LINK':r'নামজারি|কর|খতিয়ান|খতিয়ান|ম্যাপ|সেবা|mutation|land'}
    # Ministry indices often link PDFs on external government storage. Capture
    # the PUBLIC INDEX ROW instead of fetching/reclassifying a third-party CDN.
    if source['kind'] in {'CIRCULAR','FEE','OFFICE','MAP'}:
        for row in parser.rows:
            if len(row)<30 or not re.search(terms[source['kind']],row,re.I):continue
            first=row.split(' ',1)[0]
            if not re.fullmatch(r'[0-9০-৯]+[.।]?',first):continue
            items.append({'source_url':final_url,'item_key':'row-'+first,'title':row[:240],'excerpt':row[:600]})
            if len(items)>=25:break
    for link in parser.links:
        url=urllib.parse.urljoin(final_url,link['href'])
        parts=urllib.parse.urlsplit(url)
        url=urllib.parse.urlunsplit((parts.scheme,parts.netloc,urllib.parse.quote(parts.path,safe="/%:@-._~!$&'()*+,;="),parts.query,parts.fragment))
        try:official_url(url)
        except (ValueError,TypeError):continue
        label=link['label']
        row=clean(' '.join(link['row']))
        if label in ('দেখুন','বিস্তারিত','View','Read more') and len(row)>len(label):label=row
        if len(label)<5 or url in seen or url==final_url or not re.search(terms[source['kind']],label,re.I):continue
        # Avoid navbar-like page links for notices: collect actual notice records only.
        if source['kind']=='NOTICE' and '/notices/' not in urllib.parse.urlsplit(url).path:continue
        seen.add(url);items.append({'source_url':url,'title':label[:240],'excerpt':row[:600] if row else ''})
        if len(items)>=31:break
    semantic=hashlib.sha256(json.dumps(items,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return items,semantic

def collect(source,fetcher=None):
    if source['kind'] not in KINDS:raise ValueError('Unknown source kind')
    f=fetcher or Fetcher();body,final=f.page(source['url']);items,digest=parse_page(source,body,final)
    if source['kind']=='LINK':
        # The configured URL itself is the service link being checked. Never
        # turn a service-health check into a crawl of its unrelated navigation.
        items=[{'source_url':final,'title':source['title_bn'],'excerpt':items[0]['excerpt'] if items else '', 'health':'REACHABLE'}]
        digest=hashlib.sha256(json.dumps(items,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return {'schema_version':1,'source_key':source['key'],'kind':source['kind'],'fetched_at':dt.datetime.now(dt.timezone.utc).isoformat(),
            'raw_sha256':hashlib.sha256(body).hexdigest(),'semantic_sha256':digest,'items':items,'fetch_count':f.count}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--stdin',action='store_true');ap.add_argument('--key');args=ap.parse_args()
    if args.stdin:source=json.loads(sys.stdin.read(5001))
    else:
        sources=json.loads(Path(__file__).with_name('sources.json').read_text());source=next(s for s in sources if s['key']==args.key)
    try:result=collect(source)
    except Exception as exc:result={'error':str(exc)[:250]}
    print(json.dumps(result,ensure_ascii=False))
    return 1 if 'error' in result else 0
if __name__=='__main__':sys.exit(main())
