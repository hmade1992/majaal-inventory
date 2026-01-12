import { supabase } from "../../supabase/supabase.js";
import { showMessage, showLoading } from "../../utils/helpers.js";

const form = document.getElementById("loginForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  showLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  showLoading(false);

  if (error || !data.user) {
    showMessage("خطأ في البريد الإلكتروني أو كلمة المرور", "error");
    return;
  }

  // جلب البروفايل
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    showMessage("حسابك غير نشط، يرجى التواصل مع المسؤول", "error");
    return;
  }

  showMessage("تم تسجيل الدخول بنجاح");

  setTimeout(() => {
    window.location.href = "/dashboard.html";
  }, 800);
});

// إذا المستخدم داخل بالفعل
(async () => {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    window.location.href = "/dashboard.html";
  }
})();
