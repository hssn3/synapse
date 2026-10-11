import zipfile
import xml.etree.ElementTree as ET
import json
import os

pptx_path = r'C:\Users\NvDAdmin\Desktop\2\شاخص 1405-1404.pptx'

mapping = []

with zipfile.ZipFile(pptx_path, 'r') as z:
    file_list = z.namelist()
    slide_files = sorted(
        [f for f in file_list if f.startswith('ppt/slides/slide') and f.endswith('.xml')],
        key=lambda x: int(x.replace('ppt/slides/slide', '').replace('.xml', ''))
    )

    for idx, s_path in enumerate(slide_files, start=1):
        s_base = os.path.basename(s_path)
        s_rels_path = f"ppt/slides/_rels/{s_base}.rels"
        
        slide_charts = []
        if s_rels_path in file_list:
            rels_tree = ET.fromstring(z.read(s_rels_path))
            for rel in rels_tree:
                target = rel.attrib.get('Target', '')
                rtype = rel.attrib.get('Type', '')
                if 'chart' in rtype:
                    # target is e.g. "../charts/chart1.xml"
                    norm_chart = os.path.normpath(os.path.join('ppt/slides', target)).replace('\\', '/')
                    slide_charts.append(norm_chart)
        
        chart_details = []
        for c_path in slide_charts:
            c_base = os.path.basename(c_path)
            c_rels_path = f"ppt/charts/_rels/{c_base}.rels"
            excel_target = None
            if c_rels_path in file_list:
                c_rels_tree = ET.fromstring(z.read(c_rels_path))
                for rel in c_rels_tree:
                    target = rel.attrib.get('Target', '')
                    rtype = rel.attrib.get('Type', '')
                    if 'package' in rtype or 'embedding' in target:
                        excel_target = os.path.normpath(os.path.join('ppt/charts', target)).replace('\\', '/')
            
            # Read chart title and type from c_path
            c_xml = z.read(c_path)
            c_tree = ET.fromstring(c_xml)
            c_titles = [t.text for t in c_tree.iter() if t.tag.endswith('}t') and t.text]
            chart_type = 'unknown'
            for elem in c_tree.iter():
                tag = elem.tag.split('}')[-1]
                if tag.endswith('Chart'):
                    chart_type = tag
                    break

            chart_details.append({
                'chart_path': c_path,
                'chart_type': chart_type,
                'chart_titles': c_titles,
                'excel_file': excel_target
            })
        
        # Read text shapes on slide
        s_xml = z.read(s_path)
        s_tree = ET.fromstring(s_xml)
        slide_texts = [t.text.strip() for t in s_tree.iter() if t.tag.endswith('}t') and t.text and t.text.strip()]
        
        mapping.append({
            'slide_num': idx,
            'slide_path': s_path,
            'slide_texts': slide_texts,
            'charts': chart_details
        })

with open('scripts/slide_chart_excel_map.json', 'w', encoding='utf-8') as f:
    json.dump(mapping, f, ensure_ascii=False, indent=2)

print(f"Mapped {len(mapping)} slides to charts and Excel files.")
