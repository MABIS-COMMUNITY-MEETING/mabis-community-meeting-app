import json
from pathlib import Path
stats=json.loads(Path('/tmp/stats.json').read_text())
parts=stats['nodeParts']
entry=next(c for c in stats['tree']['children'] if c['name'].startswith('assets/index-'))
def total(node, metric='gzipLength'):
    return parts[node['uid']].get(metric,0) if 'uid' in node else sum(total(c,metric) for c in node.get('children',[]))
mods=next(c for c in entry['children'] if c['name']=='node_modules')
for package in sorted(mods.get('children',[]),key=total,reverse=True)[:50]:
    print(f"{total(package):8} gzip {total(package,'renderedLength'):9} raw {package['name']}")
print('\nSRC')
src=next(c for c in entry['children'] if c['name']=='src')
for child in sorted(src.get('children',[]),key=total,reverse=True)[:40]:
    print(f"{total(child):8} gzip {total(child,'renderedLength'):9} raw {child['name']}")
