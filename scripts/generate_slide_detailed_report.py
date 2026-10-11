import json

with open('scripts/slide_chart_excel_map.json', 'r', encoding='utf-8') as f:
    slides = json.load(f)

with open('scripts/all_embedded_excels.json', 'r', encoding='utf-8') as f:
    excels = json.load(f)

with open('scripts/slide_detailed_report.txt', 'w', encoding='utf-8') as out:
    for s in slides:
        out.write(f"==================== SLIDE {s['slide_num']} ====================\n")
        out.write(f"Slide Texts: {' | '.join(s['slide_texts'])}\n")
        for c in s['charts']:
            out.write(f"  Chart Type: {c['chart_type']}\n")
            out.write(f"  Chart Titles: {' '.join(c['chart_titles'])}\n")
            out.write(f"  Excel File: {c['excel_file']}\n")
            
            ex_key = c['excel_file']
            if ex_key and ex_key in excels:
                ex_data = excels[ex_key]
                for sname, srows in ex_data['sheets'].items():
                    out.write(f"    --- Sheet: {sname} ({len(srows)} rows) ---\n")
                    for r in srows[:15]: # first 15 rows
                        row_vals = [f"{cell['ref']}={cell['val']}" for cell in r['cells'] if cell['val'] is not None]
                        out.write(f"      Row {r['row']}: {', '.join(row_vals)}\n")
            elif not ex_key:
                out.write("  (No embedded Excel for this chart / slide)\n")
        out.write("\n")

print("Generated slide_detailed_report.txt")
