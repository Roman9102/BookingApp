const API = "http://quickconnect-api-m617.onrender.com/api";

/* ========================
   SEND OTP
======================== */
document
  .getElementById("forgotPasswordForm")
  ?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email =
      document.getElementById("email").value.trim();

    const message =
      document.getElementById("forgotMessage");

    const button =
      document.getElementById("sendOtpBtn");

    button.disabled = true;
    button.innerHTML =
      `<i class="fa-solid fa-spinner fa-spin"></i> Sending...`;

    message.style.color = "#94a3b8";
    message.textContent = "";

    try {

      const res = await fetch(
        `${API}/password/forgot-password`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            email
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {

        message.style.color = "#ef4444";
        message.textContent =
          data.message || "Failed to send OTP.";

        return;

      }

      message.style.color = "#22c55e";
      message.textContent =
        data.message || "OTP sent successfully.";

      localStorage.setItem(
        "resetEmail",
        email
      );

      setTimeout(() => {

        window.location.href =
          "reset-password.html";

      }, 1500);

    } catch (err) {

      console.error(err);

      message.style.color = "#ef4444";
      message.textContent =
        "Server connection failed.";

    } finally {

      button.disabled = false;

      button.innerHTML =
        `<i class="fa-solid fa-paper-plane"></i> Send OTP`;

    }

  });