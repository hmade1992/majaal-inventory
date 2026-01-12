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

  // فقط المدير يقدر يدخل
  if (userProfile.role !== 'admin') {
    showMessage('ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
    setTimeout(() => {
      window.location.href = '/majaal-inventory/dashboard.html';
    }, 2000);
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
    console.error(error);
    showMessage('خطأ في تحميل المستخدمين', 'error');
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
      <td>${user.id}</td>
      <td>
        <select data-id="${user.id}" class="role-select">
          <option value="employee" ${user.role === 'employee' ? 'selected' : ''}>موظف</option>
          <option value="manager" ${user.role === 'manager' ? 'selected' : ''}>مشرف</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
        </select>
      </td>
      <td>${status}</td>
      <td>${formatDate(user.created_at)}</td>
      <td>
        <button class="btn ${user.is_active ? 'btn-danger' : 'btn-primary'}"
          onclick="toggleUser('${user.id}', ${!user.is_active})">
          ${user.is_active ? 'تعطيل' : 'تفعيل'}
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });

  // تغيير الدور
  document.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async e => {
      const userId = e.target.dataset.id;
      const newRole = e.target.value;

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error(error);
        showMessage('فشل تحديث الدور', 'error');
        return;
      }

      showMessage('تم تحديث الدور بنجاح');
    });
  });
}

window.toggleUser = async function(userId, isActive) {
  showLoading(true);

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  showLoading(false);

  if (error) {
    console.error(error);
    showMessage('فشل تحديث حالة المستخدم', 'error');
    return;
  }

  showMessage(isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم');
  await loadUsers();
};

init();
