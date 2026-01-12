import { supabase } from "../../supabase/supabase.js";
import { showMessage, showLoading } from "../../utils/helpers.js";

const form = document.getElementById("loginForm");

// تسجيل الدخول
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showMessage("ادخل البريد وكلمة المرور", "error");
    return;
  }

  showLoading(true);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    showLoading(false);
    showMessage("خطأ في البريد الإلكتروني أو كلمة المرور", "error");
    return;
  }

  // جلب البروفايل
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    showLoading(false);
    showMessage("هذا الحساب غير مسجل في النظام", "error");
    return;
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    showLoading(false);
    showMessage("حسابك غير نشط، يرجى التواصل مع المسؤول", "error");
    return;
  }

  showLoading(false);

  // نجاح
  window.location.href = "/majaal-inventory/dashboard.html";
});
