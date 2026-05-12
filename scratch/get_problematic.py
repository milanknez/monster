import json
import os

monsters_dir = 'src/data/monsters'
all_data = {}

for filename in sorted(os.listdir(monsters_dir)):
    if filename.endswith('.json'):
        path = os.path.join(monsters_dir, filename)
        with open(path, 'r', encoding='utf-8') as f:
            all_data[filename] = json.load(f)

# Just print the first 5 problematic ones to start with
problematic = []
for fn, data in all_data.items():
    if data['name']['cz'] == data['name']['en'] or data['description']['cz'] == data['description']['en']:
        problematic.append(fn)

print(json.dumps(problematic[:20]))
