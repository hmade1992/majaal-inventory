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
  await loadInventoryHistory();
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

  document.getElementById('inventoryForm').addEventListener('submit', handleSubmit);

  document.getElementById('filterDate').addEventListener('change', loadInventoryHistory);

  document.getElementById('logoutBtn').addEventListener('click', signOut);

  const today = new Date().toISOString().split('T')[0];
  document.getElementById('filterDate').value = today;
}

async function handleSubmit(e) {
  e.preventDefault();

  const itemId = document.getElementById('itemId').value;
  const countedQty = parseFloat(document.getElementById('countedQty').value);
  const notes = document.getElementById('notes').value;

  const selectedItem = items.find(item => item.id === itemId);
  if (!selectedItem) return;

  showLoading(true);

  const { error } = await supabase
    .from('daily_inventory')
    .insert([{
      item_id: itemId,
      previous_quantity: selectedItem.current_quantity,
      counted_quantity: countedQty,
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

async function loadInventoryHistory() {
  const filterDate = document.getElementById('filterDate').value;
  let query = supabase
    .from('daily_inventory')
    .select(`
      *,
      items(name),
      user_profiles(full_name)
    `)
    .order('created_at', { ascending: false });

  if (filterDate) {
    query = query.eq('inventory_date', filterDate);
  }

  const { data } = await query;

  const tbody = document.querySelector('#inventoryTable tbody');
  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">لا توجد سجلات</td></tr>';
    return;
  }

  data.forEach(record => {
    const row = document.createElement('tr');
    const difference = record.counted_quantity - record.previous_quantity;
    const diffClass = difference < 0 ? 'color: red' : difference > 0 ? 'color: green' : '';

    row.innerHTML = `
      <td>${formatDate(record.inventory_date)}</td>
      <td>${record.items.name}</td>
      <td>${formatNumber(record.previous_quantity)}</td>
      <td>${formatNumber(record.counted_quantity)}</td>
      <td style="${diffClass}">${difference > 0 ? '+' : ''}${formatNumber(difference)}</td>
      <td>${record.user_profiles?.full_name || 'غير معروف'}</td>
      <td>${record.notes || '-'}</td>
    `;

    tbody.appendChild(row);
  });
}

init();
