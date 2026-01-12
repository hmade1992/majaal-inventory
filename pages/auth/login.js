import { supabase } from "../../supabase/supabase.js";

const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");
const loader = document.getElementById("loader");

function showMessage(text, type="info") {
  msg.innerText = text;
  msg.style.color = type === "error" ? "red" : "green";
}

function showLoading(show) {
  loader.style.display = show ? "flex" : "none";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  showLoading(true);
  showMessage("");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.user) {
    showLoading(false);
    showMessage("البريد أو كلمة المرور غير صحيحة", "error");
    return;
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", data.user.id)
    .single();

  if (!profile || profile.is_active === false) {
    await supabase.auth.signOut();
    showLoading(false);
    showMessage("حسابك غير نشط", "error");
    return;
  }

  window.location.href = "/majaal-inventory/dashboard.html";
});

// لو مسجل دخول من قبل
(async () => {
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    window.location.href = "/majaal-inventory/dashboard.html";
  }
})();
