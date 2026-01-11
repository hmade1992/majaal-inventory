import { supabase, checkAuth, signOut } from '../../config/supabase.js';
import { formatNumber, isLowStock, showLoading } from '../../utils/helpers.js';

let currentUser = null;
let userProfile = null;

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

  await loadStats();
  await loadItems();
  showLoading(false);
}

async function loadStats() {
  const { data: items } = await supabase
    .from('items')
    .select('*');

  const lowStockItems = items.filter(item =>
    isLowStock(item.current_quantity, item.min_quantity)
  );

  const today = new Date().toISOString().split('T')[0];

  const { data: todayInventoryData } = await supabase
    .from('daily_inventory')
    .select('*', { count: 'exact' })
    .eq('inventory_date', today);

  const { data: todayDamagesData } = await supabase
    .from('damages')
    .select('*', { count: 'exact' })
    .eq('damage_date', today);

  document.getElementById('totalItems').textContent = items.length;
  document.getElementById('lowStockItems').textContent = lowStockItems.length;
  document.getElementById('todayInventory').textContent = todayInventoryData?.length || 0;
  document.getElementById('todayDamages').textContent = todayDamagesData?.length || 0;

  if (lowStockItems.length > 0) {
    const alertDiv = document.getElementById('lowStockAlert');
    alertDiv.innerHTML = `
      <div class="alert alert-warning">
        <strong>تنبيه:</strong> هناك ${lowStockItems.length} صنف/أصناف قاربت على النفاد
      </div>
    `;
  }
}

async function loadItems() {
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .order('name');

  const tbody = document.querySelector('#itemsTable tbody');
  tbody.innerHTML = '';

  items.forEach(item => {
    const row = document.createElement('tr');
    const isLow = isLowStock(item.current_quantity, item.min_quantity);

    if (isLow) {
      row.classList.add('low-stock');
    }

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${formatNumber(item.current_quantity)}</td>
      <td>${item.unit}</td>
      <td>${formatNumber(item.min_quantity)}</td>
    `;

    tbody.appendChild(row);
  });
}

document.getElementById('logoutBtn').addEventListener('click', signOut);

init();
