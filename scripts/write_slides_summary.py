import json

with open('scripts/slides_deep_structure.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

with open('scripts/slides_summary.txt', 'w', encoding='utf-8') as out:
    for s in slides:
        out.write(f"=== SLIDE {s['slide_num']} ===\n")
        out.write(f"Charts: {s['charts']}\n")
        out.write(f"Images: {s['images']}\n")
        out.write(f"Tables count: {len(s['tables'])}\n")
        for tidx, tbl in enumerate(s['tables']):
            out.write(f"  Table {tidx+1}:\n")
            for row in tbl:
                out.write(f"    {row}\n")
        out.write("Texts:\n")
        for t in s['texts']:
            if t:
                out.write(f"  - {t}\n")
        out.write("\n" + "="*50 + "\n\n")

print("Wrote slides_summary.txt")
