const API = "http://quickconnect-api-m617.onrender.com/api";

/* ========================
   SOCKET.IO
======================== */
const socket = io("http://quickconnect-api-m617.onrender.com");

socket.on("bookingUpdate", () => {
  loadAnalytics();
});

/* ==================
   GLOBAL STATE
================== */
let currentGalleryImages = [];
let currentGalleryIndex = 0;

/* ==================
   SWIPE STATE
================== */
let touchStartX = 0;
let touchEndX = 0;

/* ==================
   INIT
======================== */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("1. Page loaded");

  const token = localStorage.getItem("token");

  console.log(
    "2. Token:",
    token ? "exists" : "null"
  );

  if (!token) {
    console.log("3. No token, redirecting");
    window.location.href = "/login.html";
    return;
  }

  const user =
    JSON.parse(
      localStorage.getItem("user") || "null"
    );

  if (!user) {
    console.log(
      "3b. No user object, redirecting"
    );

    localStorage.removeItem("token");

    window.location.href =
      "/login.html";

    return;
  }

  /* =========================
     THIS DASHBOARD BELONGS
     TO SERVICE PROVIDERS
  ========================= */

  if (
    user.role !==
    "serviceProvider"
  ) {
    console.log(
      "3c. User is not a service provider."
    );

    window.location.href =
      "/login.html";

    return;
  }

  try {
    console.log(
      "4. Calling loadAnalytics"
    );

    await loadAnalytics();

    console.log(
      "5. Analytics loaded"
    );

  } catch (err) {
    console.error(
      "Dashboard initialization error:",
      err
    );
  }
});

/* ========================
   ANALYTICS
======================== */
async function loadAnalytics() {

  try {

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {
      window.location.href =
        "/login.html";
      return;
    }

    const res =
      await fetch(
        `${API}/admin/analytics`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`
          }
        }
      );

    if (
      res.status === 401 ||
      res.status === 403
    ) {

      console.error(
        "Analytics authorization failed:",
        res.status
      );

      return;
    }

    if (!res.ok) {
      throw new Error(
        "Failed to load analytics"
      );
    }

    const data =
      await res.json();

    console.log(
      "Analytics Response:",
      data
    );

    console.log(
      "Recent Bookings:",
      data.recentBookings
    );

    /* =========================
       TOP CARDS
    ========================= */

    const revenueEl =
      document.getElementById(
        "revenueTotal"
      );

    const bookingsEl =
      document.getElementById(
        "bookingCount"
      );

    const completedEl =
      document.getElementById(
        "completedCount"
      );

    const servicesEl =
      document.getElementById(
        "serviceCount"
      );

    const averageBookingEl =
      document.getElementById(
        "averageBooking"
      );

    if (revenueEl) {
      revenueEl.textContent =
        `R${Number(
          data.totalRevenue || 0
        ).toLocaleString()}`;
    }

    if (bookingsEl) {
      bookingsEl.textContent =
        Number(
          data.totalBookings || 0
        ).toLocaleString();
    }

    if (completedEl) {
      completedEl.textContent =
        Number(
          data.completedBookings || 0
        ).toLocaleString();
    }

    /* =========================
       SERVICE COUNT
       LOAD FROM PROVIDER SERVICES
       WITHOUT LOADING SERVICE DATA
       INTO THE DASHBOARD
    ========================= */

    if (servicesEl) {

      try {

        const serviceRes =
          await fetch(
            `${API}/services/my`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`
              }
            }
          );

        if (
          serviceRes.ok
        ) {

          const services =
            await serviceRes.json();

          servicesEl.textContent =
            Array.isArray(services)
              ? services.length.toLocaleString()
              : "0";

        } else {

          servicesEl.textContent =
            "0";

          console.error(
            "Failed to load service count:",
            serviceRes.status
          );

        }

      } catch (serviceErr) {

        console.error(
          "Service count error:",
          serviceErr
        );

        servicesEl.textContent =
          "0";

      }

    }

    if (averageBookingEl) {
      averageBookingEl.textContent =
        `R${Number(
          data.averageBooking || 0
        ).toLocaleString()}`;
    }

    /* =========================
       BOOKING STATUS
    ========================= */

    const pendingEl =
      document.getElementById(
        "pendingCount"
      );

    const declinedEl =
      document.getElementById(
        "declinedCount"
      );

    if (pendingEl) {
      pendingEl.textContent =
        Number(
          data.pendingBookings || 0
        ).toLocaleString();
    }

    if (declinedEl) {
      declinedEl.textContent =
        Number(
          data.declinedBookings || 0
        ).toLocaleString();
    }

    /* =========================
       PAYMENT METHODS
    ========================= */

    const cashEl =
      document.getElementById(
        "cashPayments"
      );

    const cardEl =
      document.getElementById(
        "cardPayments"
      );

    const eftEl =
      document.getElementById(
        "eftPayments"
      );

    if (cashEl) {
      cashEl.textContent =
        Number(
          data.paymentMethods?.cash ||
          0
        ).toLocaleString();
    }

    if (cardEl) {
      cardEl.textContent =
        Number(
          data.paymentMethods?.card ||
          0
        ).toLocaleString();
    }

    if (eftEl) {
      eftEl.textContent =
        Number(
          data.paymentMethods?.eft ||
          0
        ).toLocaleString();
    }

    /* =========================
       TOP SERVICES
    ========================= */

    const topServices =
      document.getElementById(
        "topServices"
      );

    if (
      topServices &&
      Array.isArray(
        data.topServices
      )
    ) {

      if (
        data.topServices.length ===
        0
      ) {

        topServices.innerHTML =
          "<p>No booking data available.</p>";

      } else {

        topServices.innerHTML =
          data.topServices
            .map(service => `
              <div class="top-service-row">
                <span>
                  ${escapeHtml(
                    service.name ||
                    "Unknown"
                  )}
                </span>

                <strong>
                  ${Number(
                    service.bookings || 0
                  )} bookings
                </strong>
              </div>
            `)
            .join("");

      }

    }

    /* =========================
       RECENT BOOKINGS
    ========================= */

    const recentBookings =
      document.getElementById(
        "recentBookingsTable"
      );

    if (
      recentBookings &&
      Array.isArray(
        data.recentBookings
      )
    ) {

      if (
        data.recentBookings.length ===
        0
      ) {

        recentBookings.innerHTML = `
          <tr>
            <td colspan="6">
              No recent bookings.
            </td>
          </tr>
        `;

      } else {

        recentBookings.innerHTML =
          data.recentBookings
            .map(
              booking => `
                <tr>
                  <td>
                    ${escapeHtml(
                      booking.customer || "-"
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      booking.service || "-"
                    )}
                  </td>

                  <td>
                    R${Number(
                      booking.amount || 0
                    ).toLocaleString()}
                  </td>

                  <td>
                    <span class="status ${
                      booking.status || "pending"
                    }">
                      ${
                        escapeHtml(
                          booking.status ||
                          "pending"
                        )
                      }
                    </span>
                  </td>

                  <td>
                    ${
                      escapeHtml(
                        booking.paymentMethod ||
                        "-"
                      )
                    }
                  </td>

                  <td>
                    ${
                      booking.date
                        ? new Date(
                            booking.date
                          ).toLocaleDateString()
                        : "-"
                    }
                  </td>
                </tr>
              `
            )
            .join("");

      }

    }

    drawChart(data);

  } catch (err) {

    console.error(
      "Analytics error:",
      err
    );

  }

}

/* =========================
   CHARTS
========================= */

let weeklyRevenueChart = null;
let weeklyBookingsChart = null;
let paymentChart = null;
let topServicesChart = null;
let monthlyRevenueChart = null;

function destroyChart(chart) {

  if (chart) {
    chart.destroy();
  }

}

/* =========================
   REST OF FILE
========================= */

function drawChart(data) {

  if (
    typeof Chart ===
    "undefined"
  ) {

    console.error(
      "Chart.js is not loaded."
    );

    return;
  }

  drawWeeklyRevenueChart(data);
  drawWeeklyBookingsChart(data);
  drawPaymentChart(data);
  drawTopServicesChart(data);
  drawMonthlyRevenueChart(data);

}

function drawWeeklyRevenueChart(data) {

  const canvas =
    document.getElementById(
      "weeklyRevenueChart"
    );

  if (!canvas) return;

  destroyChart(
    weeklyRevenueChart
  );

  const ctx =
    canvas.getContext("2d");

  const weekly =
    Array.isArray(
      data?.weeklyRevenue
    )
      ? data.weeklyRevenue
      : [];

  weeklyRevenueChart =
    new Chart(ctx, {

      type: "bar",

      data: {

        labels:
          weekly.map(
            x => x?.day || ""
          ),

        datasets: [

          {

            label: "Revenue",

            data:
              weekly.map(
                x =>
                  Number(
                    x?.revenue || 0
                  )
              ),

            borderRadius: 10,

            backgroundColor:
              "rgba(59,130,246,.8)",

            borderColor:
              "#3b82f6",

            borderWidth: 2

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false,

        plugins: {

          legend: {

            labels: {
              color: "#fff"
            }

          }

        },

        scales: {

          x: {

            ticks: {
              color: "#cbd5e1"
            },

            grid: {
              color:
                "rgba(255,255,255,.05)"
            }

          },

          y: {

            beginAtZero: true,

            ticks: {

              color: "#60a5fa",

              callback(value) {

                return "R" +
                  Number(
                    value
                  ).toLocaleString();

              }

            },

            grid: {
              color:
                "rgba(255,255,255,.05)"
            }

          }

        }

      }

    });

}

function drawWeeklyBookingsChart(
  data
) {

  const canvas =
    document.getElementById(
      "weeklyBookingsChart"
    );

  if (!canvas) return;

  destroyChart(
    weeklyBookingsChart
  );

  const ctx =
    canvas.getContext("2d");

  const weekly =
    Array.isArray(
      data?.weeklyBookings
    )
      ? data.weeklyBookings
      : [];

  weeklyBookingsChart =
    new Chart(ctx, {

      type: "line",

      data: {

        labels:
          weekly.map(
            x => x?.day || ""
          ),

        datasets: [

          {

            label: "Bookings",

            data:
              weekly.map(
                x =>
                  Number(
                    x?.bookings || 0
                  )
              ),

            borderColor:
              "#22c55e",

            backgroundColor:
              "rgba(34,197,94,.15)",

            fill: true,

            tension: .35,

            pointRadius: 5,

            pointHoverRadius: 7,

            borderWidth: 3

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false,

        plugins: {

          legend: {

            labels: {
              color: "#fff"
            }

          }

        },

        scales: {

          x: {

            ticks: {
              color: "#cbd5e1"
            },

            grid: {
              color:
                "rgba(255,255,255,.05)"
            }

          },

          y: {

            beginAtZero: true,

            ticks: {
              color: "#22c55e"
            },

            grid: {
              color:
                "rgba(255,255,255,.05)"
            }

          }

        }

      }

    });

}

function drawPaymentChart(data) {

  const canvas =
    document.getElementById(
      "paymentChart"
    );

  if (!canvas) return;

  destroyChart(paymentChart);

  const ctx =
    canvas.getContext("2d");

  const payments =
    data?.paymentMethods || {};

  paymentChart =
    new Chart(ctx, {

      type: "doughnut",

      data: {

        labels: [
          "Cash",
          "Card",
          "EFT"
        ],

        datasets: [

          {

            data: [

              Number(
                payments.cash || 0
              ),

              Number(
                payments.card || 0
              ),

              Number(
                payments.eft || 0
              )

            ],

            backgroundColor: [
              "#22c55e",
              "#3b82f6",
              "#f59e0b"
            ],

            borderWidth: 2,

            borderColor:
              "#0b1220"

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false,

        plugins: {

          legend: {

            position: "bottom",

            labels: {
              color: "#ffffff"
            }

          }

        }

      }

    });

}

function drawTopServicesChart(
  data
) {

  const canvas =
    document.getElementById(
      "topServicesChart"
    );

  if (!canvas) return;

  destroyChart(
    topServicesChart
  );

  const ctx =
    canvas.getContext("2d");

  const services =
    Array.isArray(
      data?.topServices
    )
      ? data.topServices
      : [];

  topServicesChart =
    new Chart(ctx, {

      type: "bar",

      data: {

        labels:
          services.map(
            s =>
              s?.name ||
              "Unknown"
          ),

        datasets: [

          {

            label: "Bookings",

            data:
              services.map(
                s =>
                  Number(
                    s?.bookings || 0
                  )
              ),

            backgroundColor:
              "rgba(168,85,247,.8)",

            borderColor:
              "#a855f7",

            borderWidth: 2,

            borderRadius: 8

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false,

        indexAxis: "y",

        plugins: {

          legend: {

            labels: {
              color: "#ffffff"
            }

          }

        }

      }

    });

}

function drawMonthlyRevenueChart(
  data
) {

  const canvas =
    document.getElementById(
      "monthlyRevenueChart"
    );

  if (!canvas) return;

  destroyChart(
    monthlyRevenueChart
  );

  const ctx =
    canvas.getContext("2d");

  const monthly =
    Array.isArray(
      data?.monthlyRevenue
    )
      ? data.monthlyRevenue
      : [];

  monthlyRevenueChart =
    new Chart(ctx, {

      type: "line",

      data: {

        labels:
          monthly.map(
            x =>
              x?.month ||
              ""
          ),

        datasets: [

          {

            label:
              "Monthly Revenue",

            data:
              monthly.map(
                x =>
                  Number(
                    x?.revenue || 0
                  )
              ),

            borderColor:
              "#f59e0b",

            backgroundColor:
              "rgba(245,158,11,.15)",

            fill: true,

            tension: .35,

            pointRadius: 5,

            pointHoverRadius: 7,

            borderWidth: 3

          }

        ]

      },

      options: {

        responsive: true,

        maintainAspectRatio:
          false,

        plugins: {

          legend: {

            labels: {
              color: "#fff"
            }

          }

        },

        scales: {

          x: {

            ticks: {
              color: "#cbd5e1"
            },

            grid: {
              color:
                "rgba(255,255,255,.05)"
            }

          },

          y: {

            beginAtZero: true,

            ticks: {

              color: "#f59e0b",

              callback(value) {

                return "R" +
                  Number(
                    value
                  ).toLocaleString();

              }

            },

            grid: {
              color:
                "rgba(255,255,255,.05)"
            }

          }

        }

      }

    });

}

/* =========================
   HTML ESCAPE
   ANALYTICS ONLY
========================= */

function escapeHtml(value) {

  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}