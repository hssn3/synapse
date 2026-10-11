import sys
import zipfile
import xml.etree.ElementTree as ET
import json

sys.stdout.reconfigure(encoding='utf-8')

pptx_path = r'C:\Users\NvDAdmin\Desktop\2\شاخص 1405-1404.pptx'

with zipfile.ZipFile(pptx_path, 'r') as z:
    # 1. Map slides to charts
    slide_to_charts = {}
    for i in range(1, 77):
        rel_name = f'ppt/slides/_rels/slide{i}.xml.rels'
        if rel_name in z.namelist():
            tree = ET.fromstring(z.read(rel_name))
            charts = []
            for rel in tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
                target = rel.attrib.get('Target', '')
                if 'chart' in target:
                    charts.append(target.split('/')[-1])
            slide_to_charts[i] = charts

    # 2. Extract chart titles and data summaries
    chart_info = {}
    for name in z.namelist():
        if name.startswith('ppt/charts/chart') and name.endswith('.xml'):
            tree = ET.fromstring(z.read(name))
            chart_file = name.split('/')[-1]
            
            # Find chart title
            title_texts = []
            for title_elem in tree.iter():
                if title_elem.tag.endswith('}title'):
                    for t in title_elem.iter():
                        if t.tag.endswith('}t') and t.text and t.text.strip():
                            title_texts.append(t.text.strip())
            
            # Find series names
            ser_names = []
            for ser in tree.iter():
                if ser.tag.endswith('}ser'):
                    # find series title
                    st = [t.text.strip() for t in ser.iter() if t.tag.endswith('}t') and t.text and t.text.strip()]
                    if st:
                        ser_names.append(st[0])
            
            # Find category labels (x-axis)
            cats = []
            for cat in tree.iter():
                if cat.tag.endswith('}cat'):
                    cats = [t.text.strip() for t in cat.iter() if t.tag.endswith('}v') and t.text and t.text.strip()]
                    if not cats:
                        cats = [t.text.strip() for t in cat.iter() if t.tag.endswith('}t') and t.text and t.text.strip()]
            
            chart_info[chart_file] = {
                'title': ' '.join(title_texts) if title_texts else 'بدون عنوان در چارت',
                'series': ser_names[:5],
                'categories': cats[:6]
            }

    # 3. Analyze all 76 slides
    slides_data = []
    for i in range(1, 77):
        sname = f'ppt/slides/slide{i}.xml'
        slide_texts = []
        if sname in z.namelist():
            tree = ET.fromstring(z.read(sname))
            for elem in tree.iter():
                if elem.tag.endswith('}t') and elem.text and elem.text.strip():
                    slide_texts.append(elem.text.strip())
        
        c_list = slide_to_charts.get(i, [])
        charts_detail = [chart_info.get(c, {'title': c}) for c in c_list]
        
        slides_data.append({
            'slide': i,
            'text': ' | '.join(slide_texts),
            'charts': charts_detail
        })

    with open(r'c:\Users\NvDAdmin\Desktop\313\scripts\indicators_extracted.json', 'w', encoding='utf-8') as f:
        json.dump(slides_data, f, ensure_ascii=False, indent=2)

    print(f'Successfully analyzed 76 slides, saved to scripts/indicators_extracted.json')
