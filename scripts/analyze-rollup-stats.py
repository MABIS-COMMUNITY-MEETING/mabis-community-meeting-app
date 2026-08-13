import json
from pathlib import Path

stats = json.loads(Path('/tmp/stats.json').read_text())
parts = stats['nodeParts']
entry = next(child for child in stats['tree']['children'] if child['name'].startswith('assets/index-'))

def total(node, metric='gzipLength'):
    if 'uid' in node:
        return parts[node['uid']].get(metric, 0)
    return sum(total(child, metric) for child in node.get('children', []))

print(entry['name'], total(entry))
for child in sorted(entry['children'], key=total, reverse=True):
    print(f"{total(child):8} gzip  {total(child, 'renderedLength'):9} raw  {child['name']}")
    if child['name'] == '\x00/node_modules':
        for package in sorted(child.get('children', []), key=total, reverse=True)[:30]:
            print(f"  {total(package):8} gzip  {total(package, 'renderedLength'):9} raw  {package['name']}")
