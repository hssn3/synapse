import zipfile
import xml.etree.ElementTree as ET
import json
import os
from io import BytesIO

pptx_path = r'C:\Users\NvDAdmin\Desktop\2\شاخص 1405-1404.pptx'

output_info = []

with zipfile.ZipFile(pptx_path, 'r') as z:
    file_list = z.namelist()
    slide_files = sorted(
        [f for f in file_list if f.startswith('ppt/slides/slide') and f.endswith('.xml')],
        key=lambda x: int(x.replace('ppt/slides/slide', '').replace('.xml', ''))
    )
    
    # Check embedded xlsx files
    embedded_xlsx = [f for f in file_list if f.startswith('ppt/embeddings/') and f.endswith('.xlsx')]
    print(f"Total slides: {len(slide_files)}, Total embedded xlsx: {len(embedded_xlsx)}")

    # Let's inspect slide relations to see what shapes/charts/tables exist on each slide
    for idx, s_path in enumerate(slide_files, start=1):
        s_xml = z.read(s_path)
        tree = ET.fromstring(s_xml)
        
        # All text elements
        all_texts = []
        for elem in tree.iter():
            if elem.tag.endswith('}t') and elem.text:
                all_texts.append(elem.text.strip())
        
        # Check shapes, tables, pictures, charts
        tables = []
        for tbl in tree.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}tbl'):
            table_rows = []
            for tr in tbl.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}tr'):
                row_cells = []
                for tc in tr.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}tc'):
                    cell_text = "".join([t.text for t in tc.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}t') if t.text])
                    row_cells.append(cell_text.strip())
                table_rows.append(row_cells)
            tables.append(table_rows)

        # Check relationships
        rels_path = f"ppt/slides/_rels/{os.path.basename(s_path)}.rels"
        charts = []
        images = []
        if rels_path in z.namelist():
            rels_tree = ET.fromstring(z.read(rels_path))
            for rel in rels_tree:
                target = rel.attrib.get('Target', '')
                rtype = rel.attrib.get('Type', '')
                if 'chart' in rtype:
                    charts.append(target)
                elif 'image' in rtype:
                    images.append(target)
        
        output_info.append({
            'slide_num': idx,
            'slide_path': s_path,
            'texts': all_texts,
            'tables': tables,
            'charts': charts,
            'images': images
        })

with open('scripts/slides_deep_structure.json', 'w', encoding='utf-8') as f:
    json.dump(output_info, f, ensure_ascii=False, indent=2)

print(f"Wrote deep structure for {len(output_info)} slides.")
