import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open(r'c:\Users\NvDAdmin\Desktop\313\scripts\indicators_extracted.json', encoding='utf-8') as f:
    ext_data = json.load(f)

with open(r'c:\Users\NvDAdmin\Desktop\313\scripts\indicators_full_data.json', encoding='utf-8') as f:
    full_data = json.load(f)

full_by_slide = {item['slide']: item for item in full_data}

# Assign sections
# Section 1: اسلایدهای 1 تا 18: شاخص‌های کلان بیمارستان و اورژانس
# Section 2: اسلایدهای 19 تا 40: شاخص‌های توصیفی جراحی، بلوک زایمان و پاراکلینیک
# Section 3: اسلایدهای 41 تا 56: شاخص‌های عملکردی دفتر پرستاری
# Section 4: اسلایدهای 57 تا 60: شاخص‌های رعایت ایمنی بیمار
# Section 5: اسلایدهای 61 تا 69: شاخص‌های کنترل عفونت
# Section 6: اسلایدهای 70 تا 73: شاخص‌های آموزش به بیمار و ایمنی همراه
# Section 7: اسلایدهای 74 تا 76: شاخص‌های آموزش کارکنان

def get_section(slide):
    if 1 <= slide <= 18:
        return ('hospital_macro', 'شاخص‌های کلان بیمارستان و اورژانس')
    elif 19 <= slide <= 40:
        return ('surgical_maternity', 'اعمال جراحی، بلوک زایمان و پاراکلینیک')
    elif 41 <= slide <= 56:
        return ('nursing_office', 'شاخص‌های عملکردی دفتر پرستاری')
    elif 57 <= slide <= 60:
        return ('patient_safety', 'شاخص‌های رعایت ایمنی بیمار')
    elif 61 <= slide <= 69:
        return ('infection_control', 'شاخص‌های عملکردی کنترل عفونت')
    elif 70 <= slide <= 73:
        return ('patient_education', 'آموزش به بیمار و ایمنی همراه')
    else:
        return ('staff_education', 'شاخص‌های آموزش و توانمندسازی کارکنان')

processed = []
for s in ext_data:
    s_num = s['slide']
    sec_id, sec_title = get_section(s_num)
    slide_text = s['text']
    
    chart_info = full_by_slide.get(s_num)
    title = ''
    data_table = []
    if chart_info:
        title = chart_info.get('title') or ''
        data_table = chart_info.get('data') or []
    
    if not title and s['charts']:
        title = s['charts'][0].get('title', '')
    if not title:
        title = slide_text or f"اسلاید {s_num}"

    # Determine type
    chart_type = 'chart'
    if not data_table:
        chart_type = 'intro' if ('نگاه' in title or 'سپاسگزاریم' in title) else 'card'
    elif 'درصد' in title or 'نرخ' in title or 'میانگین' in title:
        chart_type = 'percentage'
    elif 'دلایل' in title or 'علل' in title or 'تفكيك' in title:
        chart_type = 'breakdown'
    else:
        chart_type = 'count'

    # Check for corrective actions
    corr = ''
    if s_num == 68 or 'اقدامات اصلاحی' in slide_text:
        corr = slide_text

    processed.append({
        'slide_number': s_num,
        'section_id': sec_id,
        'section_title': sec_title,
        'title': title,
        'slide_text': slide_text,
        'chart_type': chart_type,
        'data': data_table,
        'corrective_actions': corr
    })

print(f"Total processed: {len(processed)}")
for p in processed[:10]:
    print(f"[{p['slide_number']:02d}] {p['section_title']} -> {p['title']} ({p['chart_type']}, rows={len(p['data'])})")
