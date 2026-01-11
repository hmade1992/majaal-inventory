/*
  # إنشاء نظام إدارة المخزون

  ## الجداول الجديدة
  
  ### 1. items (الأصناف)
    - `id` (uuid, primary key)
    - `name` (text) - اسم الصنف
    - `category` (text) - المجال (بورسلين/رخام/مواد صحية)
    - `current_quantity` (numeric) - الكمية الحالية (يدعم الكسور)
    - `unit` (text) - وحدة القياس (متر/قطعة/كرتون)
    - `min_quantity` (numeric) - الحد الأدنى للتنبيه
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  ### 2. daily_inventory (الجرد اليومي)
    - `id` (uuid, primary key)
    - `item_id` (uuid, foreign key) - معرف الصنف
    - `previous_quantity` (numeric) - الكمية السابقة
    - `counted_quantity` (numeric) - جرد اليوم
    - `difference` (numeric) - الفرق (محسوب تلقائياً)
    - `inventory_date` (date) - تاريخ الجرد
    - `recorded_by` (uuid) - المستخدم المسجل
    - `notes` (text) - ملاحظات
    - `created_at` (timestamptz)
  
  ### 3. damages (التوالف)
    - `id` (uuid, primary key)
    - `item_id` (uuid, foreign key) - معرف الصنف
    - `quantity` (numeric) - كمية التالف
    - `reason` (text) - سبب التلف
    - `damage_date` (date) - تاريخ التلف
    - `recorded_by` (uuid) - المستخدم المسجل
    - `created_at` (timestamptz)
  
  ### 4. user_profiles (بيانات المستخدمين)
    - `id` (uuid, primary key, foreign key to auth.users)
    - `full_name` (text) - الاسم الكامل
    - `role` (text) - الدور (admin/manager/employee)
    - `is_active` (boolean) - نشط؟
    - `created_at` (timestamptz)

  ## الأمان
    - تفعيل RLS على جميع الجداول
    - سياسات الوصول حسب الدور
*/

-- إنشاء جدول الأصناف
CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('بورسلين', 'رخام', 'مواد صحية')),
  current_quantity numeric(12, 2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'متر',
  min_quantity numeric(12, 2) DEFAULT 60,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- إنشاء جدول الجرد اليومي
CREATE TABLE IF NOT EXISTS daily_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  previous_quantity numeric(12, 2) NOT NULL,
  counted_quantity numeric(12, 2) NOT NULL,
  difference numeric(12, 2) GENERATED ALWAYS AS (counted_quantity - previous_quantity) STORED,
  inventory_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, inventory_date)
);

-- إنشاء جدول التوالف
CREATE TABLE IF NOT EXISTS damages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity numeric(12, 2) NOT NULL CHECK (quantity > 0),
  reason text,
  damage_date date NOT NULL DEFAULT CURRENT_DATE,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- إنشاء جدول بيانات المستخدمين
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- إنشاء Indexes لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_daily_inventory_date ON daily_inventory(inventory_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_inventory_item ON daily_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_damages_date ON damages(damage_date DESC);
CREATE INDEX IF NOT EXISTS idx_damages_item ON damages(item_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

-- إنشاء دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي على جدول items
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- إنشاء دالة لتحديث الكمية بعد الجرد
CREATE OR REPLACE FUNCTION update_item_quantity_after_inventory()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE items 
  SET current_quantity = NEW.counted_quantity
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق التحديث التلقائي للكمية بعد الجرد
CREATE TRIGGER after_inventory_update_quantity
  AFTER INSERT ON daily_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_item_quantity_after_inventory();

-- إنشاء دالة لخصم الكمية بعد التلف
CREATE OR REPLACE FUNCTION update_item_quantity_after_damage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE items 
  SET current_quantity = current_quantity - NEW.quantity
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- تطبيق خصم الكمية بعد التلف
CREATE TRIGGER after_damage_update_quantity
  AFTER INSERT ON damages
  FOR EACH ROW
  EXECUTE FUNCTION update_item_quantity_after_damage();

-- تفعيل Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للأصناف
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة الأصناف"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المديرون والمدراء يمكنهم إضافة أصناف"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
      AND user_profiles.is_active = true
    )
  );

CREATE POLICY "المديرون والمدراء يمكنهم تعديل الأصناف"
  ON items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'manager')
      AND user_profiles.is_active = true
    )
  );

-- سياسات الأمان للجرد اليومي
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة الجرد"
  ON daily_inventory FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون النشطون يمكنهم إضافة جرد"
  ON daily_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_active = true
    )
  );

-- سياسات الأمان للتوالف
CREATE POLICY "المستخدمون المصادقون يمكنهم قراءة التوالف"
  ON damages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "المستخدمون النشطون يمكنهم إضافة توالف"
  ON damages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_active = true
    )
  );

-- سياسات الأمان لبيانات المستخدمين
CREATE POLICY "المستخدمون يمكنهم قراءة بياناتهم"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  ));

CREATE POLICY "المديرون يمكنهم إدارة المستخدمين"
  ON user_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- إدراج بيانات تجريبية للأصناف
INSERT INTO items (name, category, current_quantity, unit, min_quantity) VALUES
('بورسلين إسباني 60x60', 'بورسلين', 850.50, 'متر', 60),
('رخام كرارة أبيض', 'رخام', 320.75, 'متر', 50),
('خلاط مغسلة كروم', 'مواد صحية', 45, 'قطعة', 10),
('بورسلين إيطالي 80x80', 'بورسلين', 1200, 'متر', 100),
('رخام أسود تركي', 'رخام', 180.25, 'متر', 40),
('مغسلة بيضاوية', 'مواد صحية', 28, 'قطعة', 8);
