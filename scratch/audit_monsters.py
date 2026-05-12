import json
import os

monsters_dir = 'src/data/monsters'
problematic_files = []

for filename in os.listdir(monsters_dir):
    if filename.endswith('.json'):
        path = os.path.join(monsters_dir, filename)
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            issues = []
            
            # Check name
            name = data.get('name', {})
            cz_name = name.get('cz', '').strip()
            en_name = name.get('en', '').strip()
            sk_name = name.get('sk', '').strip()
            
            if cz_name:
                if cz_name == en_name:
                    issues.append("name_en_is_cz")
                if cz_name == sk_name and cz_name != "": # SK can be similar but often it's just a copy
                     # We only flag SK if it's identical and looks like it wasn't translated
                     issues.append("name_sk_is_cz")
            
            # Check description
            desc = data.get('description', {})
            cz_desc = desc.get('cz', '').strip()
            en_desc = desc.get('en', '').strip()
            sk_desc = desc.get('sk', '').strip()
            
            if cz_desc:
                if cz_desc == en_desc:
                    issues.append("desc_en_is_cz")
                if cz_desc == sk_desc:
                    issues.append("desc_sk_is_cz")
            
            # Check abilities
            abilities = data.get('abilities', [])
            for i, ab in enumerate(abilities):
                ab_name = ab.get('name', {})
                ab_cz = ab_name.get('cz', '').strip()
                ab_en = ab_name.get('en', '').strip()
                ab_sk = ab_name.get('sk', '').strip()
                if ab_cz:
                    if ab_cz == ab_en:
                        issues.append(f"ability_{i}_name_en_is_cz")
                    if ab_cz == ab_sk:
                        issues.append(f"ability_{i}_name_sk_is_cz")
                
                ab_desc = ab.get('description', {})
                abd_cz = ab_desc.get('cz', '').strip()
                abd_en = ab_desc.get('en', '').strip()
                abd_sk = ab_desc.get('sk', '').strip()
                if abd_cz:
                    if abd_cz == abd_en:
                        issues.append(f"ability_{i}_desc_en_is_cz")
                    if abd_cz == abd_sk:
                        issues.append(f"ability_{i}_desc_sk_is_cz")

            if issues:
                problematic_files.append({
                    "file": filename,
                    "issues": issues,
                    "cz_name": cz_name
                })
                
        except Exception as e:
            print(f"Error reading {filename}: {e}")

# Output results
print(json.dumps(problematic_files, indent=2, ensure_ascii=False))
