import json

with open('scripts/slide_chart_excel_map.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

with open('scripts/all_slides_catalog.txt', 'w', encoding='utf-8') as out:
    for s in slides:
        c_title = ""
        c_type = ""
        if s['charts']:
            c_type = s['charts'][0]['chart_type']
            c_title = ' '.join(s['charts'][0]['chart_titles'])
        
        slide_texts = ' | '.join(s['slide_texts'])
        out.write(f"Slide {s['slide_num']:02d}: Type={c_type} | ChartTitle={c_title} | SlideTexts={slide_texts}\n")

print("Wrote all_slides_catalog.txt")
