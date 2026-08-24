const API = "http://quickconnect-api-m617.onrender.com/api";

/* ========================
   PREFILL EMAIL
======================== */
document.addEventListener("DOMContentLoaded", () => {

  const savedEmail =
    localStorage.getItem("resetEmail");

  if (savedEmail) {

    document.getElementById("email").value =
      savedEmail;

  }

});

/* ========================
   RESET PASSWORD
======================== */
document
  .getElementById("resetPasswordForm")
  ?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
      document.getElementById("email").value.trim();

    const otp =
      document.getElementById("otp").value.trim();

    const newPassword =
      document.getElementById("newPassword").value;

    const confirmPassword =
      document.getElementById("confirmPassword").value;

    const message =
      document.getElementById("resetMessage");

    const button =
      document.getElementById("resetPasswordBtn");

    message.textContent = "";

    if (newPassword !== confirmPassword) {

      message.style.color = "#ef4444";
      message.textContent =
        "Passwords do not match.";

      return;

    }

    button.disabled = true;

    button.innerHTML =
      `<i class="fa-solid fa-spinner fa-spin"></i> Resetting...`;

    try {

      const res = await fetch(
        `${API}/password/reset-password`,
        {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({

            email,
            otp,
            newPassword

          })

        }
      );

      const data = await res.json();

      if (!res.ok) {

        message.style.color = "#ef4444";
        message.textContent =
          data.message || "Password reset failed.";

        return;

      }

      message.style.color = "#22c55e";
      message.textContent =
        data.message || "Password reset successful.";

      localStorage.removeItem("resetEmail");

      setTimeout(() => {

        window.location.href =
          "login.html";

      }, 2000);

    } catch (err) {

      console.error(err);

      message.style.color = "#ef4444";
      message.textContent =
        "Server connection failed.";

    } finally {

      button.disabled = false;

      button.innerHTML =
        `<i class="fa-solid fa-key"></i> Reset Password`;

    }

  });