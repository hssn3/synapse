import json

with open('scripts/slide_chart_excel_map.json', 'r', encoding='utf-8') as f:
    slides_map = json.load(f)

with open('scripts/all_embedded_excels.json', 'r', encoding='utf-8') as f:
    excels = json.load(f)

# Build complete data for every slide
full_slides_data = []

months_ordered = [
    'فروردین', 'اردیبهشت', 'خرداد', 'سه ماهه اول',
    'تیر', 'مرداد', 'شهریور', 'سه ماهه دوم',
    'مهر', 'آبان', 'آذر', 'سه ماهه سوم',
    'دی', 'بهمن', 'اسفند', 'سه ماهه چهارم', 'کل سال'
]

for s in slides_map:
    slide_num = s['slide_num']
    slide_texts = s['slide_texts']
    charts = s['charts']
    
    chart_title = ""
    chart_type = "bar"
    excel_file = None
    table_headers = []
    table_rows = []
    
    if charts:
        c = charts[0]
        c_titles = [t for t in c['chart_titles'] if t != '[VALUE]']
        chart_title = " ".join(c_titles).strip()
        c_type_raw = c['chart_type']
        if 'bar' in c_type_raw.lower():
            chart_type = 'bar'
        elif 'line' in c_type_raw.lower():
            chart_type = 'line'
        elif 'pie' in c_type_raw.lower():
            chart_type = 'pie'
        else:
            chart_type = 'bar'
        excel_file = c['excel_file']
    
    # If no chart title, derive from slide texts
    if not chart_title and slide_texts:
        chart_title = " - ".join(slide_texts)
    
    # Read Excel rows and cells
    if excel_file and excel_file in excels:
        ex_data = excels[excel_file]
        # Look at sheet1
        for sname, srows in ex_data['sheets'].items():
            if not srows:
                continue
            
            # Row 1 is usually headers
            header_row = srows[0]
            header_map = {}
            for cell in header_row['cells']:
                col_letter = "".join([ch for ch in cell['ref'] if ch.isalpha()])
                header_map[col_letter] = cell['val'] or ''
            
            # Subsequent rows
            for r in srows[1:]:
                row_dict = {}
                row_label = ""
                for cell in r['cells']:
                    col_letter = "".join([ch for ch in cell['ref'] if ch.isalpha()])
                    val = cell['val']
                    if col_letter == 'A':
                        row_label = val or ''
                    else:
                        h_name = header_map.get(col_letter, f"Col_{col_letter}")
                        row_dict[h_name] = val
                if row_label or row_dict:
                    table_rows.append({
                        'label': row_label.strip() if row_label else '',
                        'values': row_dict
                    })
            break # only first sheet

    full_slides_data.append({
        'slide_num': slide_num,
        'title': chart_title or f"اسلاید {slide_num}",
        'slide_texts': slide_texts,
        'chart_type': chart_type,
        'excel_file': excel_file,
        'table_rows': table_rows
    })

with open('scripts/full_76_slides_extracted_clean.json', 'w', encoding='utf-8') as f:
    json.dump(full_slides_data, f, ensure_ascii=False, indent=2)

print(f"Extracted clean structured data for {len(full_slides_data)} slides.")
