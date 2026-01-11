import { supabase, checkAuth, signOut } from '../../config/supabase.js';
import { formatNumber, formatDate, showMessage, showLoading } from '../../utils/helpers.js';

let currentUser = null;
let userProfile = null;
let items = [];

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
  setupEventListeners();
  showLoading(false);
}

async function loadItems() {
  const { data } = await supabase
    .from('items')
    .select('*')
    .order('name');

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

function setupEventListeners() {
  document.getElementById('itemId').addEventListener('change', (e) => {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const currentQty = selectedOption.dataset.quantity || '0';
    document.getElementById('currentQty').value = formatNumber(currentQty);
  });

  document.getElementById('damageForm').addEventListener('submit', handleSubmit);

  document.getElementById('filterDate').addEventListener('change', loadDamagesHistory);

  document.getElementById('logoutBtn').addEventListener('click', signOut);

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filterDate').value = today;
}

async function handleSubmit(e) {
  e.preventDefault();

  const itemId = document.getElementById('itemId').value;
  const damageQty = parseFloat(document.getElementById('damageQty').value);
  const reason = document.getElementById('reason').value;

  const selectedItem = items.find(item => item.id === itemId);
  if (!selectedItem) return;

  if (damageQty > parseFloat(selectedItem.current_quantity)) {
    showMessage('كمية التالف أكبر من الكمية المتوفرة', 'error');
    return;
  }

  showLoading(true);

  const { error } = await supabase
    .from('damages')
    .insert([{
      item_id: itemId,
      quantity: damageQty,
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

async function loadDamagesHistory() {
  const filterDate = document.getElementById('filterDate').value;
  let query = supabase
    .from('damages')
    .select(`
      *,
      items(name, unit),
      user_profiles(full_name)
    `)
    .order('created_at', { ascending: false });

  if (filterDate) {
    query = query.eq('damage_date', filterDate);
  }

  const { data } = await query;

  const tbody = document.querySelector('#damagesTable tbody');
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد سجلات</td></tr>';
    return;
  }

  data.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(record.damage_date)}</td>
      <td>${record.items.name}</td>
      <td>${formatNumber(record.quantity)} ${record.items.unit}</td>
      <td>${record.reason || '-'}</td>
      <td>${record.user_profiles?.full_name || 'غير معروف'}</td>
    `;

    tbody.appendChild(row);
  });
}

init();
