import zipfile
import io
import xml.etree.ElementTree as ET
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

pptx_path = r'C:\Users\NvDAdmin\Desktop\2\شاخص 1405-1404.pptx'

def parse_sheet_xml(xlsx_bytes):
    with zipfile.ZipFile(io.BytesIO(xlsx_bytes), 'r') as xz:
        # 1. shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in xz.namelist():
            sst_tree = ET.fromstring(xz.read('xl/sharedStrings.xml'))
            for si in sst_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                texts = [t.text for t in si.iter() if t.tag.endswith('}t') and t.text]
                shared_strings.append(''.join(texts))

        # 2. sheet1
        sheet_tree = ET.fromstring(xz.read('xl/worksheets/sheet1.xml'))
        rows_data = []
        for row in sheet_tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
            row_vals = []
            for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                t_attr = c.attrib.get('t')
                v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = ''
                if v_elem is not None and v_elem.text is not None:
                    raw_val = v_elem.text
                    if t_attr == 's':
                        idx = int(raw_val)
                        val = shared_strings[idx] if idx < len(shared_strings) else raw_val
                    else:
                        val = raw_val
                row_vals.append(val)
            if any(row_vals):
                rows_data.append(row_vals)
        return rows_data

# Now map slide to chart to embedded worksheet!
with zipfile.ZipFile(pptx_path, 'r') as z:
    # Map slide -> chart
    slide_chart_map = {}
    for i in range(1, 77):
        rel_name = f'ppt/slides/_rels/slide{i}.xml.rels'
        if rel_name in z.namelist():
            tree = ET.fromstring(z.read(rel_name))
            for rel in tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
                target = rel.attrib.get('Target', '')
                if 'chart' in target:
                    chart_fname = target.split('/')[-1]
                    slide_chart_map[chart_fname] = i

    # Map chart -> embedded xlsx
    chart_xlsx_map = {}
    chart_titles = {}
    for name in z.namelist():
        if name.startswith('ppt/charts/_rels/chart') and name.endswith('.xml.rels'):
            chart_fname = name.split('/')[-1].replace('.rels', '')
            tree = ET.fromstring(z.read(name))
            for rel in tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
                target = rel.attrib.get('Target', '')
                if 'embeddings' in target or 'xlsx' in target:
                    chart_xlsx_map[chart_fname] = 'ppt/' + target.replace('../', '')

        if name.startswith('ppt/charts/chart') and not name.startswith('ppt/charts/_rels/') and name.endswith('.xml'):
            chart_fname = name.split('/')[-1]
            tree = ET.fromstring(z.read(name))
            titles = []
            for title_elem in tree.iter():
                if title_elem.tag.endswith('}title'):
                    for t in title_elem.iter():
                        if t.tag.endswith('}t') and t.text and t.text.strip():
                            titles.append(t.text.strip())
            chart_titles[chart_fname] = ' '.join(titles) if titles else ''

    results = []
    for chart_fname, xlsx_path in chart_xlsx_map.items():
        slide_num = slide_chart_map.get(chart_fname, 0)
        title = chart_titles.get(chart_fname, '')
        try:
            table_data = parse_sheet_xml(z.read(xlsx_path))
        except Exception as e:
            table_data = [[f"Error: {str(e)}"]]
        
        results.append({
            'slide': slide_num,
            'chart': chart_fname,
            'title': title,
            'data': table_data
        })

    results.sort(key=lambda x: x['slide'])

    with open(r'c:\Users\NvDAdmin\Desktop\313\scripts\indicators_full_data.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f'Successfully parsed {len(results)} indicator data sheets!')
