import { supabase, checkAuth, signOut } from '../../config/supabase.js';
import { formatNumber, showLoading } from '../../utils/helpers.js';

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

  setupDateFilters();
  await generateReports();
  setupEventListeners();
  showLoading(false);
}

function setupDateFilters() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  document.getElementById('dateFrom').value = firstDayOfMonth.toISOString().split('T')[0];
  document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

function setupEventListeners() {
  document.getElementById('generateBtn').addEventListener('click', generateReports);
  document.getElementById('logoutBtn').addEventListener('click', signOut);
}

async function generateReports() {
  showLoading(true);
  await loadMostUsedItems();
  await loadMostDamagedItems();
  showLoading(false);
}

async function loadMostUsedItems() {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  const { data } = await supabase
    .from('daily_inventory')
    .select(`
      item_id,
      previous_quantity,
      counted_quantity,
      items(name, category, unit)
    `)
    .gte('inventory_date', dateFrom)
    .lte('inventory_date', dateTo);

  const itemUsage = {};

  data?.forEach(record => {
    const withdrawal = record.previous_quantity - record.counted_quantity;
    if (withdrawal > 0) {
      if (!itemUsage[record.item_id]) {
        itemUsage[record.item_id] = {
          name: record.items.name,
          category: record.items.category,
          unit: record.items.unit,
          total: 0
        };
      }
      itemUsage[record.item_id].total += withdrawal;
    }
  });

  const sortedItems = Object.entries(itemUsage)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const tbody = document.querySelector('#mostUsedTable tbody');
  tbody.innerHTML = '';

  if (sortedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد بيانات</td></tr>';
    return;
  }

  sortedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${formatNumber(item.total)}</td>
      <td>${item.unit}</td>
    `;
    tbody.appendChild(row);
  });
}

async function loadMostDamagedItems() {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  const { data } = await supabase
    .from('damages')
    .select(`
      item_id,
      quantity,
      items(name, category, unit)
    `)
    .gte('damage_date', dateFrom)
    .lte('damage_date', dateTo);

  const itemDamages = {};

  data?.forEach(record => {
    if (!itemDamages[record.item_id]) {
      itemDamages[record.item_id] = {
        name: record.items.name,
        category: record.items.category,
        unit: record.items.unit,
        total: 0
      };
    }
    itemDamages[record.item_id].total += parseFloat(record.quantity);
  });

  const sortedItems = Object.entries(itemDamages)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const tbody = document.querySelector('#mostDamagedTable tbody');
  tbody.innerHTML = '';

  if (sortedItems.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">لا توجد بيانات</td></tr>';
    return;
  }

  sortedItems.forEach((item, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${formatNumber(item.total)}</td>
      <td>${item.unit}</td>
    `;
    tbody.appendChild(row);
  });
}

init();
