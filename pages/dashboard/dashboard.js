import { supabase, checkAuth, signOut } from '../../supabase/supabase.js';
import { formatNumber, isLowStock, showLoading } from '../../utils/helpers.js';

let currentUser = null;
let userProfile = null;

/* =========================
   تشغيل الصفحة
========================= */
async function init() {
  showLoading(true);

  const auth = await checkAuth();
  if (!auth) return;

  currentUser = auth.user;
  userProfile = auth.profile;

  document.getElementById('userName').textContent = userProfile.full_name;

  // إظهار إدارة المستخدمين للأدمن فقط
  if (userProfile.role === 'admin') {
    document.getElementById('usersLink').style.display = 'block';
  }

  await loadStats();
  await loadItems();

  showLoading(false);
}

/* =========================
   تحميل الإحصائيات
========================= */
async function loadStats() {
  const { data: items, error } = await supabase
    .from('items')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  const lowStockItems = items.filter(item =>
    isLowStock(item.current_quantity, item.min_quantity)
  );

  const today = new Date().toISOString().split('T')[0];

  const { data: todayInventory } = await supabase
    .from('daily_inventory')
    .select('*')
    .eq('inventory_date', today);

  const { data: todayDamages } = await supabase
    .from('damages')
    .select('*')
    .eq('damage_date', today);

  document.getElementById('totalItems').textContent = items.length;
  document.getElementById('lowStockItems').textContent = lowStockItems.length;
  document.getElementById('todayInventory').textContent = todayInventory?.length || 0;
  document.getElementById('todayDamages').textContent = todayDamages?.length || 0;

  // تنبيه النقص
  if (lowStockItems.length > 0) {
    document.getElementById('lowStockAlert').innerHTML = `
      <div class="alert alert-warning">
        ⚠️ يوجد ${lowStockItems.length} صنف وصل للحد الأدنى أو أقل
      </div>
    `;
  } else {
    document.getElementById('lowStockAlert').innerHTML = '';
  }
}

/* =========================
   تحميل جدول الأصناف
========================= */
async function loadItems() {
  const { data: items, error } = await supabase
    .from('items')
    .select('*')
    .order('name');

  if (error) {
    console.error(error);
    return;
  }

  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = '';

  items.forEach(item => {
    const isLow = isLowStock(item.current_quantity, item.min_quantity);

    const tr = document.createElement('tr');
    if (isLow) tr.classList.add('low-stock');

    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${formatNumber(item.current_quantity)}</td>
      <td>${item.unit}</td>
      <td>${formatNumber(item.min_quantity)}</td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   تسجيل الخروج
========================= */
document.getElementById('logoutBtn').addEventListener('click', signOut);

/* =========================
   بدء الصفحة
========================= */
init();
