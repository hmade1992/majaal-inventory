import { supabase } from '../../config/supabase.js';
import { showMessage, showLoading } from '../../utils/helpers.js';

const form = document.getElementById('loginForm');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  showLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  showLoading(false);

  if (error) {
    showMessage('خطأ في البريد الإلكتروني أو كلمة المرور', 'error');
    return;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    showMessage('حسابك غير نشط، يرجى التواصل مع المسؤول', 'error');
    return;
  }

  showMessage('تم تسجيل الدخول بنجاح');
  setTimeout(() => {
    window.location.href = '/dashboard.html';
  }, 1000);
});

(async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    window.location.href = '/dashboard.html';
  }
})();
