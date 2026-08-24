// 🔐 Get user from localStorage
function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

// 🔓 Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// 🧭 Render Navbar// 🧭 Render Navbar
function renderNavbar() {

  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const user = getUser();

  if (!user) {

    navbar.innerHTML = `
      <a href="index.html">Home</a>
      <a href="services.html">Services</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;

    return;

  }

  navbar.innerHTML = `
    <a href="index.html">Home</a>
    <a href="services.html">Services</a>
    <a href="booking.html">Book</a>
    <a href="my-bookings.html">My Bookings</a>

    ${user.role === "admin" || user.role === "serviceProvider"
      ? `<a href="admin.html">Admin</a>`
      : ""}

    <a href="#" onclick="logout()">Logout</a>
  `;

}