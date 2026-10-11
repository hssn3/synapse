import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\NvDAdmin\Desktop\313\scripts\indicators_extracted.json', encoding='utf-8') as f:
    data = json.load(f)

for s in data[:22]:
    slide_num = s['slide']
    text = s['text']
    charts = s['charts']
    titles = [c['title'] for c in charts]
    t_str = ' | '.join(titles) if titles else '-'
    print(f"[{slide_num:02d}] متن: {text if text else '-'} /// نمودار: {t_str}")
