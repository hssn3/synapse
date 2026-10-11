import zipfile
import xml.etree.ElementTree as ET
import json
import os
from io import BytesIO

pptx_path = r'C:\Users\NvDAdmin\Desktop\2\شاخص 1405-1404.pptx'

def parse_sheet_xml(sheet_xml, shared_strings):
    tree = ET.fromstring(sheet_xml)
    rows_data = []
    for row in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row_num = row.attrib.get('r')
        row_cells = []
        for c in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            cell_ref = c.attrib.get('r')
            cell_type = c.attrib.get('t')
            v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = v_elem.text if v_elem is not None else None
            
            if cell_type == 's' and val is not None and val.isdigit():
                idx = int(val)
                if idx < len(shared_strings):
                    val = shared_strings[idx]
            
            row_cells.append({'ref': cell_ref, 'val': val})
        if row_cells:
            rows_data.append({'row': row_num, 'cells': row_cells})
    return rows_data

def inspect_all_embedded_excels():
    excel_data = {}
    with zipfile.ZipFile(pptx_path, 'r') as z:
        for fname in z.namelist():
            if fname.startswith('ppt/embeddings/') and fname.endswith('.xlsx'):
                print(f"Reading {fname}...")
                excel_bytes = z.read(fname)
                with zipfile.ZipFile(BytesIO(excel_bytes), 'r') as xz:
                    # Shared strings
                    shared_strings = []
                    if 'xl/sharedStrings.xml' in xz.namelist():
                        s_tree = ET.fromstring(xz.read('xl/sharedStrings.xml'))
                        for si in s_tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                            text = "".join([t.text for t in si.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
                            shared_strings.append(text)
                    
                    # Sheet 1
                    sheets = {}
                    for sfile in xz.namelist():
                        if sfile.startswith('xl/worksheets/sheet') and sfile.endswith('.xml'):
                            sheet_rows = parse_sheet_xml(xz.read(sfile), shared_strings)
                            sheets[sfile] = sheet_rows
                    
                    excel_data[fname] = {
                        'shared_strings_count': len(shared_strings),
                        'sheets': sheets
                    }
    return excel_data

all_excels = inspect_all_embedded_excels()
with open('scripts/all_embedded_excels.json', 'w', encoding='utf-8') as f:
    json.dump(all_excels, f, ensure_ascii=False, indent=2)

print(f"Dumped {len(all_excels)} embedded Excel workbooks.")
