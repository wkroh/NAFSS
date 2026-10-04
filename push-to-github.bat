@echo off
chcp 65001 > nul
echo ========================================================
echo  رفع مشروع منصة نافس - الصف التاسع إلى GitHub
echo ========================================================
echo.
set /p REPO_URL="أدخل رابط مستودع GitHub الخاص بك (مثال: https://github.com/USERNAME/etec-grade9-nafss.git): "

if "%REPO_URL%"=="" (
    echo [خطأ] لم يتم إدخال الرابط!
    pause
    exit /b
)

echo.
echo [1/3] إعداد الفرع الرئيسي main...
git branch -M main

echo [2/3] ربط المستودع البعيد origin...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo [3/3] جاري رفع الملفات إلى GitHub...
git push -u origin main

echo.
echo ========================================================
echo  تم رفع المشروع بنجاح!
echo  لتفعيل الاستضافة المجانية (GitHub Pages):
echo  1. اذهب إلى إعدادات المستودع (Settings) -> Pages
echo  2. في قسم Build and deployment اختر Branch: main ومجلد: / (root)
echo  3. اضغط Save وستحصل على رابط الموقع المباشر خلال دقيقة!
echo ========================================================
pause
