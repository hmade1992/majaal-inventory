# دليل رفع المشروع على GitHub

## الخطوات

### 1. إنشاء مستودع جديد على GitHub

1. اذهب إلى [GitHub](https://github.com)
2. اضغط على زر "New repository"
3. أدخل اسم المستودع (مثلاً: `inventory-management-system`)
4. اختر خيار "Private" أو "Public" حسب رغبتك
5. لا تختر إضافة README أو .gitignore أو LICENSE (لأنها موجودة بالفعل)
6. اضغط "Create repository"

### 2. إعداد Git محلياً

افتح terminal في مجلد المشروع وقم بتشغيل الأوامر التالية:

```bash
# تهيئة Git
git init

# إضافة جميع الملفات
git add .

# إنشاء أول commit
git commit -m "Initial commit: Complete inventory management system"

# تسمية الفرع الرئيسي
git branch -M main
```

### 3. ربط المشروع بـ GitHub

استبدل `YOUR_USERNAME` و `YOUR_REPOSITORY` باسم المستخدم واسم المستودع الخاص بك:

```bash
# ربط المستودع البعيد
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

# رفع الملفات إلى GitHub
git push -u origin main
```

### 4. التحديثات المستقبلية

عند إجراء أي تعديلات في المستقبل:

```bash
# إضافة التعديلات
git add .

# إنشاء commit مع رسالة وصفية
git commit -m "وصف التعديلات"

# رفع التعديلات
git push
```

## ملاحظات مهمة

1. **لا تنسَ ملف `.env`**:
   - هذا الملف مُضاف إلى `.gitignore` ولن يتم رفعه على GitHub
   - احتفظ بنسخة آمنة منه
   - أي شخص يريد تشغيل المشروع سيحتاج إلى إنشاء ملف `.env` خاص به

2. **ملف `.env.example`**:
   - تم إنشاء ملف `.env.example` كمرجع
   - يحتوي على أسماء المتغيرات فقط بدون القيم الحقيقية
   - يمكن رفعه على GitHub بأمان

3. **للمطورين الجدد**:
   عند استنساخ المشروع، يجب:
   ```bash
   # استنساخ المشروع
   git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

   # الدخول إلى مجلد المشروع
   cd YOUR_REPOSITORY

   # تثبيت المكتبات
   npm install

   # نسخ ملف .env.example إلى .env
   cp .env.example .env

   # تعديل ملف .env وإضافة بيانات Supabase
   # ثم تشغيل المشروع
   npm run dev
   ```

## الأوامر المفيدة

```bash
# عرض حالة الملفات
git status

# عرض سجل التعديلات
git log

# عرض الفروع
git branch

# إنشاء فرع جديد
git checkout -b feature-name

# التبديل بين الفروع
git checkout branch-name

# دمج فرع في الفرع الحالي
git merge branch-name
```

## تنظيم Commits

يُفضل استخدام رسائل commit واضحة وموصوفة:

- ✅ `"Add user authentication system"`
- ✅ `"Fix inventory calculation bug"`
- ✅ `"Update dashboard statistics"`
- ❌ `"Update"`
- ❌ `"Fix bug"`
- ❌ `"Changes"`

## مثال على workflow كامل

```bash
# التأكد من أنك على الفرع الرئيسي
git checkout main

# جلب آخر التحديثات
git pull

# إنشاء فرع جديد للميزة
git checkout -b add-export-feature

# إجراء التعديلات...

# إضافة الملفات المعدلة
git add .

# إنشاء commit
git commit -m "Add export functionality for reports"

# رفع الفرع إلى GitHub
git push -u origin add-export-feature

# في GitHub: إنشاء Pull Request
# بعد الموافقة: دمج الفرع في main
```
