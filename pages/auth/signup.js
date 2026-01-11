import { supabase } from '../../config/supabase.js';
import { showMessage, showLoading } from '../../utils/helpers.js';

const form = document.getElementById('signupForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    showMessage('كلمات المرور غير متطابقة', 'error');
    return;
  }

  showLoading(true);

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password
  });

  if (authError) {
    showLoading(false);
    showMessage('خطأ في إنشاء الحساب: ' + authError.message, 'error');
    return;
  }

  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert([{
      id: authData.user.id,
      full_name: fullName,
      role: 'employee',
      is_active: false
    }]);

  showLoading(false);

  if (profileError) {
    showMessage('خطأ في حفظ بيانات المستخدم', 'error');
    return;
  }

  showMessage('تم إنشاء الحساب بنجاح، في انتظار تفعيله من المسؤول');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 2000);
});
