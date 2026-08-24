function getUser() {
  return JSON.parse(localStorage.getItem("user"));
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {

  const nav = document.getElementById("navLinks");

  if (!nav) return;

  const user = getUser();

  nav.innerHTML = `
    <a href="index.html">Home</a>
    <a href="services.html">Services</a>
    <a href="booking.html">Book</a>
    <a href="my-bookings.html">My Bookings</a>

    ${
      user?.role === "admin" || user?.role === "serviceProvider"
        ? `<a href="admin.html">Dashboard</a>`
        : ""
    }

    <button onclick="logout()">Logout</button>
  `;

});