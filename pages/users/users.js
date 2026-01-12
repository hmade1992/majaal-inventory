import { supabase, checkAuth, signOut } from '../../config/supabase.js';
import { formatDate, showMessage, showLoading } from '../../utils/helpers.js';

let currentUser = null;
let userProfile = null;

async function init() {
  showLoading(true);

  const auth = await checkAuth();
  if (!auth) return;

  currentUser = auth.user;
  userProfile = auth.profile;

  if (userProfile.role !== 'admin') {
    showMessage('ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
    setTimeout(() => window.location.href = '/dashboard.html', 2000);
    return;
  }

  document.getElementById('userName').textContent = userProfile.full_name;

  await loadUsers();
  document.getElementById('logoutBtn').addEventListener('click', signOut);

  showLoading(false);
}

async function loadUsers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage('خطأ في تحميل المستخدمين');
    return;
  }

  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  data.forEach(user => {
    const status = user.is_active
      ? `<span style="color:green">نشط</span>`
      : `<span style="color:red">غير نشط</span>`;

    const row = document.createElement('tr');

    row.innerHTML = `
      <td>${user.full_name}</td>
      <td>${user.email}</td>
      <td>
        <select data-id="${user.user_id}" class="role-select">
          <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>موظف</option>
          <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>مشرف</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
        </select>
      </td>
      <td>${status}</td>
      <td>${formatDate(user.created_at)}</td>
      <td>
        <button class="btn ${user.is_active ? 'btn-danger' : 'btn-primary'}"
          onclick="toggleUser('${user.user_id}', ${!user.is_active})">
          ${user.is_active ? 'تعطيل' : 'تفعيل'}
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  document.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      await supabase
        .from('user_profiles')
        .update({ role: e.target.value })
        .eq('user_id', e.target.dataset.id);

      showMessage('تم تحديث الدور');
    });
  });
}

window.toggleUser = async function (userId, active) {
  showLoading(true);

  await supabase
    .from('user_profiles')
    .update({ is_active: active })
    .eq('user_id', userId);

  showLoading(false);
  showMessage(active ? 'تم التفعيل' : 'تم التعطيل');
  await loadUsers();
};

init();
