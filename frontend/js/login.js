document.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(window.location.search);

  if (params.get("reset") === "success") {
    alert("Password changed successfully. Please login.");
  }

  const form = document.getElementById("loginForm");

  if (!form) return;

  form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

      const res = await fetch("http://quickconnect-api-m617.onrender.com/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);

      localStorage.setItem("user", JSON.stringify({
        _id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role
      }));

      if (
        data.user.role === "admin" ||
        data.user.role === "serviceProvider"
      ) {

        window.location.href = "admin.html";

      } else {

        window.location.href = "index.html";

      }

    } catch (err) {

      console.error(err);
      alert("Server error");

    }

  });

});