import os
import sys
import shutil

sys.stdout.reconfigure(encoding='utf-8')

base_dir = r'C:\Users\NvDAdmin\Desktop\2'
inner_dir = os.path.join(base_dir, '2')
target_parent = os.path.join(base_dir, 'مستندات_اعتباربخشی_و_کیفیت')

# If inner_dir exists, rename it to target_parent
if os.path.exists(inner_dir) and not os.path.exists(target_parent):
    os.rename(inner_dir, target_parent)
    print(f"Renamed inner '2' to '{target_parent}'")
elif not os.path.exists(target_parent):
    print("Neither '2' nor target_parent found!")
    sys.exit(1)

mapping = {
    '01-educacion-paciente': '01_آموزش_سلامت_و_پمفلت‌های_بیمار',
    '02-stock-secciones': '02_تجهیزات_پزشکی_و_استوک_بخش‌ها',
    '03-medicamentos-kardex': '03_دارو_درمان_کاردکس_و_MSDS',
    '04-educacion-personal': '04_آموزش_توانمندسازی_و_ارزشیابی_کارکنان',
    '05-resoluciones': '05_احکام_ابلاغ‌ها_و_رابطین_مدیریتی',
    '06-certificados-licencias': '06_پروانه‌ها_مجوزها_و_صلاحیت_حرفه‌ای',
    '07-formularios': '07_فرم‌های_بالینی_کیفی_و_ثبت_دما',
    '08-imagenes-escaneos': '08_اسکن‌ها_و_مستندات_تصویری',
    '09-instrucciones-procedimientos': '09_خط‌مشی‌ها_روش‌های_اجرایی_و_SOP',
    '10-actas-acuerdos': '10_کمیته‌های_بیمارستانی_و_صورتجلسات',
    '11-crisis-desastres': '11_مدیریت_بحران_بلایا_مانور_و_پدافند',
    '12-control-infecciones': '12_کنترل_عفونت_بهداشت_دست_و_CSSD',
    '13-manuales-referencias': '13_راهنماهای_بالینی_و_تشخیص‌های_پرستاری_NANDA',
    '14-calendarios-planes': '14_برنامه‌های_عملیاتی_و_تقویم_سلامت',
    '15-indicadores-estadisticas': '15_شاخص‌ها_و_آمار_بیمارستانی',
    '16-seguridad-paciente-errores': '16_ایمنی_بیمار_خطاهای_پزشکی_RCA_و_FMEA',
    '17-checklists': '17_چک‌لیست‌های_نظارتی_و_ارزیابی',
    '18-carro-paro-reanimacion': '18_ترالی_اورژانس_و_احیا_CPR',
    '19-hemovigilancia-transfusion': '19_انتقال_خون_هموویژلانس_و_زنجیره_سرد',
    '20-rrhh-turnos': '20_منابع_انسانی_برآورد_نیرو_و_شیفت‌بندی',
    '21-politicas': '21_خط‌مشی‌های_کلان_بیمارستان',
    '22-expedientes-evaluaciones': '22_ارزیابی_پرونده‌ها_و_بازدیدهای_مدیریتی',
    '23-satisfaccion-pacientes': '23_رضایت‌سنجی_بیماران_و_همراهان',
    '24-general': '24_فرآیندهای_عمومی_تریاژ_پذیرش_ترخیص_و_چارت'
}

for old_name, new_name in mapping.items():
    old_p = os.path.join(target_parent, old_name)
    new_p = os.path.join(target_parent, new_name)
    if os.path.exists(old_p) and not os.path.exists(new_p):
        os.rename(old_p, new_p)
        print(f"Renamed {old_name} -> {new_name}")
    elif os.path.exists(new_p):
        print(f"Already renamed: {new_name}")

print("All directories successfully reorganized!")
