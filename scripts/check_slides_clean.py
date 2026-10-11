import json

with open('scripts/full_76_slides_extracted_clean.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

for s in slides:
    if s['slide_num'] in [2, 16, 23, 68]:
        print(f"=== Slide {s['slide_num']} ===")
        print('Title:', s['title'])
        print('Texts:', s['slide_texts'])
        print('Rows count:', len(s['table_rows']))
        for r in s['table_rows'][:4]:
            print('  ', r['label'], '->', r['values'])
