import json
import os

monsters_dir = 'src/data/monsters'
all_strings = {}

for filename in sorted(os.listdir(monsters_dir)):
    if filename.endswith('.json'):
        path = os.path.join(monsters_dir, filename)
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        monster_id = data['id']
        all_strings[monster_id] = {
            "name": data['name']['cz'],
            "description": data['description']['cz'],
            "abilities": []
        }
        for ab in data.get('abilities', []):
            all_strings[monster_id]["abilities"].append({
                "name": ab['name']['cz'],
                "description": ab['description']['cz']
            })

with open('scratch/monster_strings.json', 'w', encoding='utf-8') as f:
    json.dump(all_strings, f, indent=2, ensure_ascii=False)
