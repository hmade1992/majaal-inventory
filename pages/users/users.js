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
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);
    return;
  }

  document.getElementById('userName').textContent = userProfile.full_name;

  await loadUsers();
  setupEventListeners();
  showLoading(false);
}

function setupEventListeners() {
  document.getElementById('logoutBtn').addEventListener('click', signOut);
}

async function loadUsers() {
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: { users } } = await supabase.auth.admin.listUsers();

  const usersMap = {};
  users.forEach(user => {
    usersMap[user.id] = user;
  });

  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  profiles?.forEach(profile => {
    const user = usersMap[profile.id];
    const row = document.createElement('tr');

    const roleText = {
      'admin': 'مدير',
      'manager': 'مشرف',
      'employee': 'موظف'
    }[profile.role] || profile.role;

    const statusBadge = profile.is_active
      ? '<span style="color: green;">نشط</span>'
      : '<span style="color: red;">غير نشط</span>';

    row.innerHTML = `
      <td>${profile.full_name}</td>
      <td>${user?.email || 'غير معروف'}</td>
      <td>
        <select class="role-select" data-user-id="${profile.id}">
          <option value="employee" ${profile.role === 'employee' ? 'selected' : ''}>موظف</option>
          <option value="manager" ${profile.role === 'manager' ? 'selected' : ''}>مشرف</option>
          <option value="admin" ${profile.role === 'admin' ? 'selected' : ''}>مدير</option>
        </select>
      </td>
      <td>${statusBadge}</td>
      <td>${formatDate(profile.created_at)}</td>
      <td>
        ${profile.is_active
          ? `<button class="btn btn-danger" onclick="toggleUserStatus('${profile.id}', false)">تعطيل</button>`
          : `<button class="btn btn-primary" onclick="toggleUserStatus('${profile.id}', true)">تفعيل</button>`
        }
      </td>
    `;

    tbody.appendChild(row);
  });

  document.querySelectorAll('.role-select').forEach(select => {
    select.addEventListener('change', async (e) => {
      const userId = e.target.dataset.userId;
      const newRole = e.target.value;
      await updateUserRole(userId, newRole);
    });
  });
}

async function updateUserRole(userId, role) {
  showLoading(true);

  const { error } = await supabase
    .from('user_profiles')
    .update({ role })
    .eq('id', userId);

  showLoading(false);

  if (error) {
    showMessage('خطأ في تحديث الدور', 'error');
    return;
  }

  showMessage('تم تحديث الدور بنجاح');
}

window.toggleUserStatus = async function(userId, isActive) {
  showLoading(true);

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive })
    .eq('id', userId);

  showLoading(false);

  if (error) {
    showMessage('خطأ في تحديث حالة المستخدم', 'error');
    return;
  }

  showMessage(isActive ? 'تم تفعيل المستخدم بنجاح' : 'تم تعطيل المستخدم بنجاح');
  await loadUsers();
};

init();
