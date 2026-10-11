import zipfile
import xml.etree.ElementTree as ET
import os

pptx_path = r'C:\Users\NvDAdmin\Desktop\2\شاخص 1405-1404.pptx'

with zipfile.ZipFile(pptx_path, 'r') as z:
    for chart_name in ['ppt/charts/chart1.xml', 'ppt/charts/chart2.xml', 'ppt/charts/chart3.xml']:
        if chart_name in z.namelist():
            xml_data = z.read(chart_name)
            tree = ET.fromstring(xml_data)
            
            # Find chart title
            title_nodes = [t.text for t in tree.iter() if t.tag.endswith('}t') and t.text]
            print(f"=== {chart_name} ===")
            print("Texts in chart XML:", title_nodes[:20])

            # Find chart type
            for elem in tree.iter():
                tag = elem.tag.split('}')[-1]
                if tag.endswith('Chart'):
                    print("Chart type tag:", tag)
