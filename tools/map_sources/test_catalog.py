import contextlib, io, json, pathlib, tempfile, unittest
from unittest.mock import patch
import collect_public_catalog as c

class PublicCatalogueTests(unittest.TestCase):
    def test_semantic_changes_ignore_tokens(self):
        with tempfile.TemporaryDirectory() as d:
            out=pathlib.Path(d)/'catalog.json'; cache=pathlib.Path(d)/'cache'
            def run(token,selector='Mouza'):
                page=f'<title>Official map</title><input value="{token}"><select id="{selector}"></select><a href="https://land.gov.bd/">Service</a>'.encode()
                with patch.object(c,'get',side_effect=[b'User-agent: *\nDisallow:\n',page]) as get,patch.object(c.time,'sleep'),contextlib.redirect_stdout(io.StringIO()):
                    c.collect(out,cache)
                    self.assertEqual(get.call_count,2)
                return json.loads(out.read_text())
            first=run('csrf-one'); second=run('csrf-two'); third=run('csrf-three','Sheet')
            self.assertNotEqual(first['sha256'],second['sha256'])
            self.assertEqual(first['semantic_sha256'],second['semantic_sha256'])
            self.assertFalse(second['changed_since_previous'])
            self.assertTrue(third['changed_since_previous'])
            self.assertEqual(third['reuse_status'],'REQUIRES_SOURCE_AND_RIGHTS_REVIEW')
    def test_robots_denial_stops_page_fetch(self):
        with tempfile.TemporaryDirectory() as d,patch.object(c,'get',return_value=b'User-agent: *\nDisallow: /\n') as get:
            with self.assertRaises(ValueError):c.collect(pathlib.Path(d)/'out.json',pathlib.Path(d)/'cache')
            self.assertEqual(get.call_count,1)

if __name__=='__main__':unittest.main()
