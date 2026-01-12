import { supabase, checkAuth, signOut } from '../../config/supabase.js';
import { formatNumber, formatDate, showMessage, showLoading } from '../../utils/helpers.js';

let currentUser = null;
let userProfile = null;
let items = [];

/* =========================
   Init
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
  await loadDamagesHistory();
  setupEvents();

  showLoading(false);
}

/* =========================
   Load Items
========================= */
async function loadItems() {
  const { data, error } = await supabase.from('items').select('*').order('name');

  if (error) {
    showMessage('خطأ في تحميل الأصناف', 'error');
    return;
  }

  items = data;

  const select = document.getElementById('itemId');
  select.innerHTML = '<option value="">اختر الصنف</option>';

  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${item.name} (${formatNumber(item.current_quantity)} ${item.unit})`;
    opt.dataset.quantity = item.current_quantity;
    select.appendChild(opt);
  });
}

/* =========================
   Events
========================= */
function setupEvents() {
  document.getElementById('itemId').addEventListener('change', e => {
    const option = e.target.options[e.target.selectedIndex];
    document.getElementById('currentQty').value = formatNumber(option?.dataset.quantity || 0);
  });

  document.getElementById('damageForm').addEventListener('submit', handleSubmit);
  document.getElementById('filterDate').addEventListener('change', loadDamagesHistory);
  document.getElementById('logoutBtn').addEventListener('click', signOut);

  document.getElementById('filterDate').value = new Date().toISOString().split('T')[0];
}

/* =========================
   Submit Damage
========================= */
async function handleSubmit(e) {
  e.preventDefault();

  const itemId = document.getElementById('itemId').value;
  const qty = parseFloat(document.getElementById('damageQty').value);
  const reason = document.getElementById('reason').value;

  if (!itemId || isNaN(qty) || qty <= 0) {
    showMessage('أدخل كمية صحيحة واختر الصنف', 'error');
    return;
  }

  const item = items.find(i => i.id === itemId);
  if (!item) return;

  if (qty > item.current_quantity) {
    showMessage('كمية التلف أكبر من الكمية المتوفرة', 'error');
    return;
  }

  showLoading(true);

  const { error } = await supabase.from('damages').insert([{
    item_id: itemId,
    quantity: qty,
    damage_date: new Date().toISOString().split('T')[0],
    reason: reason || null,
    recorded_by: currentUser.id
  }]);

  showLoading(false);

  if (error) {
    showMessage('خطأ في تسجيل التلف', 'error');
    return;
  }

  showMessage('تم تسجيل التلف بنجاح');
  document.getElementById('damageForm').reset();
  document.getElementById('currentQty').value = '';

  await loadItems();
  await loadDamagesHistory();
}

/* =========================
   Load History
========================= */
async function loadDamagesHistory() {
  const date = document.getElementById('filterDate').value;

  let query = supabase
    .from('damages')
    .select(`
      id,
      damage_date,
      quantity,
      reason,
      items ( name, unit ),
      user_profiles ( full_name )
    `)
    .order('damage_date', { ascending: false });

  if (date) query = query.eq('damage_date', date);

  const { data, error } = await query;

  const tbody = document.querySelector('#damagesTable tbody');
  tbody.innerHTML = '';

  if (error || !data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">لا توجد بيانات</td></tr>`;
    return;
  }

  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.damage_date)}</td>
      <td>${r.items?.name || '-'}</td>
      <td>${formatNumber(r.quantity)} ${r.items?.unit || ''}</td>
      <td>${r.reason || '-'}</td>
      <td>${r.user_profiles?.full_name || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

init();
