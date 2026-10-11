import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\NvDAdmin\Desktop\313\scripts\indicators_full_data.json', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    s = item['slide']
    t = item['title']
    rows = item['data']
    print(f"\n==================== اسلاید {s:02d}: {t} ====================")
    for r in rows:
        print("  |  ".join(r))
