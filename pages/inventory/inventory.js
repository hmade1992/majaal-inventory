import { supabase, checkAuth, signOut } from '../../config/supabase.js';
import { formatNumber, formatDate, showMessage, showLoading } from '../../utils/helpers.js';

let currentUser = null;
let userProfile = null;
let items = [];

/* =========================
   بدء الصفحة
========================= */
async function init() {
  showLoading(true);

  const auth = await checkAuth();
  if (!auth) return;

  currentUser = auth.user;
  userProfile = auth.profile;

  document.getElementById('userName').textContent = userProfile.full_name;

  if (userProfile.role === 'admin') {
    document.getElementById('usersLink').style.display = 'block';
  }

  await loadItems();
  await loadInventoryHistory();
  setupEventListeners();

  showLoading(false);
}

/* =========================
   تحميل الأصناف
========================= */
async function loadItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('name');

  if (error) {
    showMessage('خطأ في تحميل الأصناف', 'error');
    return;
  }

  items = data;

  const select = document.getElementById('itemId');
  select.innerHTML = '<option value="">اختر الصنف</option>';

  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = `${item.name} (${formatNumber(item.current_quantity)} ${item.unit})`;
    option.dataset.quantity = item.current_quantity;
    select.appendChild(option);
  });
}

/* =========================
   الأحداث
========================= */
function setupEventListeners() {
  document.getElementById('itemId').addEventListener('change', e => {
    const option = e.target.options[e.target.selectedIndex];
    document.getElementById('currentQty').value = formatNumber(option?.dataset.quantity || 0);
  });

  document.getElementById('inventoryForm').addEventListener('submit', handleSubmit);
  document.getElementById('filterDate').addEventListener('change', loadInventoryHistory);
  document.getElementById('logoutBtn').addEventListener('click', signOut);

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filterDate').value = today;
}

/* =========================
   حفظ الجرد
========================= */
async function handleSubmit(e) {
  e.preventDefault();

  const itemId = document.getElementById('itemId').value;
  const countedQty = parseFloat(document.getElementById('countedQty').value);
  const notes = document.getElementById('notes').value;

  if (!itemId || isNaN(countedQty)) {
    showMessage('يرجى اختيار صنف وإدخال كمية صحيحة', 'error');
    return;
  }

  const selectedItem = items.find(i => i.id === itemId);
  if (!selectedItem) return;

  showLoading(true);

  const { error } = await supabase.from('daily_inventory').insert([{
    item_id: itemId,
    previous_quantity: selectedItem.current_quantity,
    counted_quantity: countedQty,
    inventory_date: new Date().toISOString().split('T')[0],
    recorded_by: currentUser.id,
    notes: notes || null
  }]);

  showLoading(false);

  if (error) {
    if (error.code === '23505') {
      showMessage('تم تسجيل جرد لهذا الصنف اليوم بالفعل', 'error');
    } else {
      showMessage('خطأ في حفظ الجرد', 'error');
    }
    return;
  }

  showMessage('تم حفظ الجرد بنجاح');
  document.getElementById('inventoryForm').reset();
  document.getElementById('currentQty').value = '';

  await loadItems();
  await loadInventoryHistory();
}

/* =========================
   تحميل سجل الجرد
========================= */
async function loadInventoryHistory() {
  const filterDate = document.getElementById('filterDate').value;

  let query = supabase
    .from('daily_inventory')
    .select(`
      id,
      inventory_date,
      previous_quantity,
      counted_quantity,
      notes,
      items ( name ),
      user_profiles ( full_name )
    `)
    .order('inventory_date', { ascending: false });

  if (filterDate) {
    query = query.eq('inventory_date', filterDate);
  }

  const { data, error } = await query;

  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';

  if (error || !data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">لا توجد بيانات</td></tr>';
    return;
  }

  data.forEach(r => {
    const diff = r.counted_quantity - r.previous_quantity;
    const color = diff < 0 ? 'red' : diff > 0 ? 'green' : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.inventory_date)}</td>
      <td>${r.items?.name || '-'}</td>
      <td>${formatNumber(r.previous_quantity)}</td>
      <td>${formatNumber(r.counted_quantity)}</td>
      <td style="color:${color}">${diff > 0 ? '+' : ''}${formatNumber(diff)}</td>
      <td>${r.user_profiles?.full_name || '-'}</td>
      <td>${r.notes || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

init();
