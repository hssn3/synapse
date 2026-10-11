import json

with open('scripts/full_76_slides_extracted_clean.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

for s in slides:
    if s['slide_num'] in [2, 12, 16, 20, 23, 36, 42, 52, 62, 68, 71, 75]:
        print(f"=== Slide {s['slide_num']}: {s['title']} ===")
        print(f"Texts: {' | '.join(s['slide_texts'])}")
        print(f"Table rows count: {len(s['table_rows'])}")
        for r in s['table_rows'][:6]:
            print(f"  {r['label']} -> {r['values']}")
        print()
