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
  setupEvents();

  showLoading(false);
}

/* ===========================
   Dates
=========================== */
function setupDateFilters() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  document.getElementById('dateFrom').value = firstDay.toISOString().split('T')[0];
  document.getElementById('dateTo').value = today.toISOString().split('T')[0];
}

/* ===========================
   Events
=========================== */
function setupEvents() {
  document.getElementById('generateBtn').addEventListener('click', generateReports);
  document.getElementById('logoutBtn').addEventListener('click', signOut);
}

/* ===========================
   Generate
=========================== */
async function generateReports() {
  showLoading(true);
  await loadMostUsedItems();
  await loadMostDamagedItems();
  showLoading(false);
}

/* ===========================
   Most Used
=========================== */
async function loadMostUsedItems() {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  const { data, error } = await supabase
    .from('daily_inventory')
    .select(`
      item_id,
      previous_quantity,
      counted_quantity,
      inventory_date,
      items ( name, category, unit )
    `)
    .gte('inventory_date', dateFrom)
    .lte('inventory_date', dateTo);

  if (error || !data) return;

  const usage = {};

  data.forEach(r => {
    const diff = r.previous_quantity - r.counted_quantity;
    if (diff > 0) {
      if (!usage[r.item_id]) {
        usage[r.item_id] = {
          name: r.items.name,
          category: r.items.category,
          unit: r.items.unit,
          total: 0
        };
      }
      usage[r.item_id].total += diff;
    }
  });

  renderTable('#mostUsedTable', usage);
}

/* ===========================
   Most Damaged
=========================== */
async function loadMostDamagedItems() {
  const dateFrom = document.getElementById('dateFrom').value;
  const dateTo = document.getElementById('dateTo').value;

  const { data, error } = await supabase
    .from('damages')
    .select(`
      item_id,
      quantity,
      damage_date,
      items ( name, category, unit )
    `)
    .gte('damage_date', dateFrom)
    .lte('damage_date', dateTo);

  if (error || !data) return;

  const damages = {};

  data.forEach(r => {
    if (!damages[r.item_id]) {
      damages[r.item_id] = {
        name: r.items.name,
        category: r.items.category,
        unit: r.items.unit,
        total: 0
      };
    }
    damages[r.item_id].total += parseFloat(r.quantity);
  });

  renderTable('#mostDamagedTable', damages);
}

/* ===========================
   Render Table
=========================== */
function renderTable(tableId, dataObj) {
  const sorted = Object.values(dataObj)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const tbody = document.querySelector(`${tableId} tbody`);
  tbody.innerHTML = '';

  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">لا توجد بيانات</td></tr>`;
    return;
  }

  sorted.forEach((item, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>${formatNumber(item.total)}</td>
      <td>${item.unit}</td>
    `;
    tbody.appendChild(tr);
  });
}

init();
