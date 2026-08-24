/* =========================
   BOOKING HISTORY
   booking-history.js
========================= */

const token = localStorage.getItem("token");

let historyChart = null;
let statusChart = null;


/* =========================
   LOAD BOOKING HISTORY
========================= */

async function loadBookingHistory() {

  try {

    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const res = await fetch(
      "https://quickconnect-api-m617.onrender.com/api/bookings/history",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message ||
        "Failed to load booking history"
      );
    }

    if (!Array.isArray(data)) {
      throw new Error(
        "Invalid booking history response"
      );
    }

    renderHistory(data);
    renderHistoryChart(data);

  } catch (err) {

    console.error(
      "LOAD BOOKING HISTORY ERROR:",
      err
    );

    const historyList =
      document.getElementById("historyList");

    const historyTableBody =
      document.getElementById(
        "historyTableBody"
      );

    const errorHTML = `
      <div class="service-card">
        <h3>Failed to load booking history.</h3>
        <p>Please refresh the page and try again.</p>
      </div>
    `;

    if (historyList) {
      historyList.innerHTML = errorHTML;
    }

    if (historyTableBody) {
      historyTableBody.innerHTML = `
        <tr>
          <td
            colspan="6"
            style="
              text-align:center;
              padding:40px;
              color:#94a3b8;
            "
          >
            Failed to load booking history.
          </td>
        </tr>
      `;
    }

  }

}


/* =========================
   RENDER HISTORY
========================= */

function renderHistory(bookings) {

  const historyList =
    document.getElementById("historyList");

  const historyTableBody =
    document.getElementById(
      "historyTableBody"
    );

  /*
   * SUPPORT CARD LAYOUT
   */

  if (historyList) {

    if (!bookings.length) {

      historyList.innerHTML = `
        <div class="service-card">

          <h3>No booking history yet.</h3>

          <p>
            Completed, declined and cancelled
            bookings will appear here.
          </p>

        </div>
      `;

    } else {

      historyList.innerHTML =
        bookings
          .map((booking) => {

            return createHistoryCard(
              booking
            );

          })
          .join("");

    }

  }


  /*
   * SUPPORT TABLE LAYOUT
   */

  if (historyTableBody) {

    if (!bookings.length) {

      historyTableBody.innerHTML = `
        <tr>

          <td
            colspan="6"
            style="
              text-align:center;
              padding:40px;
              color:#94a3b8;
            "
          >

            <i
              class="fa fa-clock-rotate-left"
              style="
                font-size:35px;
                display:block;
                margin-bottom:12px;
              "
            ></i>

            No booking history yet.

          </td>

        </tr>
      `;

    } else {

      historyTableBody.innerHTML =
        bookings
          .map((booking) => {

            return createHistoryTableRow(
              booking
            );

          })
          .join("");

    }

  }


  /*
   * UPDATE SUMMARY CARDS
   */

  updateHistorySummary(bookings);

}


/* =========================
   HISTORY CARD
========================= */

function createHistoryCard(booking) {

  const status =
    String(
      booking.status ||
      "unknown"
    )
      .toLowerCase()
      .trim();

  const serviceName =
    booking.service?.name ||
    "Service";

  const bookingDate =
    booking.bookingDate
      ? new Date(
          booking.bookingDate
        ).toLocaleDateString()
      : "N/A";

  const bookingTime =
    booking.bookingTime ||
    "N/A";

  const price =
    Number(
      booking.price || 0
    );

  const payment =
    booking.paymentMethod ||
    "N/A";

  const customerName =
    booking.user?.name ||
    booking.customerName ||
    "Customer";

  const customerEmail =
    booking.user?.email ||
    booking.customerEmail ||
    "";

  let statusClass =
    "history-status";

  if (status === "completed") {
    statusClass += " completed";
  }

  else if (status === "declined") {
    statusClass += " declined";
  }

  else if (status === "cancelled") {
    statusClass += " cancelled";
  }

  return `

    <div
      class="service-card booking-history-card"
      data-status="${escapeHtml(status)}"
    >

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:15px;
        flex-wrap:wrap;
      ">

        <div>

          <h3>
            ${escapeHtml(serviceName)}
          </h3>

          <p>
            <strong>Date:</strong>
            ${escapeHtml(bookingDate)}
          </p>

          <p>
            <strong>Time:</strong>
            ${escapeHtml(bookingTime)}
          </p>

          <p>
            <strong>Payment:</strong>
            ${escapeHtml(payment)}
          </p>

          <p>
            <strong>Amount:</strong>
            R${price.toFixed(2)}
          </p>

          <p>
            <strong>Customer:</strong>
            ${escapeHtml(customerName)}
          </p>

          ${
            customerEmail
              ? `
                <p>
                  <strong>Email:</strong>
                  ${escapeHtml(customerEmail)}
                </p>
              `
              : ""
          }

        </div>

        <div class="${statusClass}">
          ${escapeHtml(status)}
        </div>

      </div>

      ${
        booking.declineReason
          ? `
            <div style="
              margin-top:15px;
              padding:12px;
              border-radius:10px;
              background:rgba(239,68,68,.12);
              border:1px solid rgba(239,68,68,.2);
            ">

              <strong>Decline Reason:</strong>

              <p style="margin-top:6px;">
                ${escapeHtml(
                  booking.declineReason
                )}
              </p>

            </div>
          `
          : ""
      }

      ${
        booking.postponedReason
          ? `
            <div style="
              margin-top:15px;
              padding:12px;
              border-radius:10px;
              background:rgba(59,130,246,.12);
              border:1px solid rgba(59,130,246,.2);
            ">

              <strong>Booking Note:</strong>

              <p style="margin-top:6px;">
                ${escapeHtml(
                  booking.postponedReason
                )}
              </p>

            </div>
          `
          : ""
      }

    </div>

  `;

}


/* =========================
   HISTORY TABLE ROW
========================= */

function createHistoryTableRow(
  booking
) {

  const status =
    String(
      booking.status ||
      "unknown"
    )
      .toLowerCase()
      .trim();

  const serviceName =
    booking.service?.name ||
    "Service";

  const date =
    booking.bookingDate
      ? new Date(
          booking.bookingDate
        ).toLocaleDateString()
      : "N/A";

  const time =
    booking.bookingTime ||
    "N/A";

  const price =
    Number(
      booking.price || 0
    );

  const payment =
    booking.paymentMethod ||
    "N/A";

  return `

    <tr>

      <td>
        ${escapeHtml(serviceName)}
      </td>

      <td>
        ${escapeHtml(date)}
      </td>

      <td>
        ${escapeHtml(time)}
      </td>

      <td>
        R${price.toFixed(2)}
      </td>

      <td>
        ${escapeHtml(payment)}
      </td>

      <td>

        <span
          class="history-status ${escapeHtml(
            status
          )}"
        >
          ${escapeHtml(status)}
        </span>

      </td>

    </tr>

  `;

}


/* =========================
   UPDATE SUMMARY
========================= */

function updateHistorySummary(
  bookings
) {

  const total =
    bookings.length;

  const completed =
    bookings.filter(
      booking =>
        String(
          booking.status || ""
        ).toLowerCase() ===
        "completed"
    ).length;

  const declined =
    bookings.filter(
      booking =>
        String(
          booking.status || ""
        ).toLowerCase() ===
        "declined"
    ).length;

  const cancelled =
    bookings.filter(
      booking =>
        String(
          booking.status || ""
        ).toLowerCase() ===
        "cancelled"
    ).length;


  const totalElement =
    document.getElementById(
      "totalHistory"
    );

  const completedElement =
    document.getElementById(
      "completedHistory"
    );

  const declinedElement =
    document.getElementById(
      "declinedHistory"
    );

  const cancelledElement =
    document.getElementById(
      "cancelledHistory"
    );


  if (totalElement) {
    totalElement.textContent =
      total;
  }

  if (completedElement) {
    completedElement.textContent =
      completed;
  }

  if (declinedElement) {
    declinedElement.textContent =
      declined;
  }

  if (cancelledElement) {
    cancelledElement.textContent =
      cancelled;
  }

}


/* =========================
   BOOKING HISTORY CHART
========================= */

function renderHistoryChart(
  bookings
) {

  const canvas =
    document.getElementById(
      "bookingHistoryChart"
    );

  const statusCanvas =
    document.getElementById(
      "bookingStatusChart"
    );


  const completed =
    bookings.filter(
      booking =>
        String(
          booking.status || ""
        ).toLowerCase() ===
        "completed"
    ).length;

  const declined =
    bookings.filter(
      booking =>
        String(
          booking.status || ""
        ).toLowerCase() ===
        "declined"
    ).length;

  const cancelled =
    bookings.filter(
      booking =>
        String(
          booking.status || ""
        ).toLowerCase() ===
        "cancelled"
    ).length;


  /*
   * BAR CHART
   */

  if (canvas) {

    if (
      typeof Chart ===
      "undefined"
    ) {

      console.error(
        "Chart.js is not loaded."
      );

      return;

    }

    if (historyChart) {
      historyChart.destroy();
    }

    historyChart =
      new Chart(
        canvas.getContext("2d"),
        {
          type: "bar",

          data: {

            labels: [
              "Completed",
              "Declined",
              "Cancelled"
            ],

            datasets: [
              {
                label:
                  "Booking History",

                data: [
                  completed,
                  declined,
                  cancelled
                ],

                borderWidth: 1,

                borderRadius: 10,

                maxBarThickness: 70
              }
            ]

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

              legend: {
                display: false
              },

              tooltip: {
                enabled: true
              }

            },

            scales: {

              y: {

                beginAtZero: true,

                ticks: {
                  precision: 0
                }

              }

            }

          }

        }
      );

  }


  /*
   * DOUGHNUT CHART
   */

  if (
    statusCanvas &&
    typeof Chart !==
    "undefined"
  ) {

    if (statusChart) {
      statusChart.destroy();
    }

    statusChart =
      new Chart(
        statusCanvas.getContext(
          "2d"
        ),
        {
          type: "doughnut",

          data: {

            labels: [
              "Completed",
              "Declined",
              "Cancelled"
            ],

            datasets: [
              {
                data: [
                  completed,
                  declined,
                  cancelled
                ],

                borderWidth: 0
              }
            ]

          },

          options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "68%",

            plugins: {

              legend: {
                position: "bottom"
              },

              tooltip: {
                enabled: true
              }

            }

          }

        }
      );

  }

}


/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {

  return String(value)
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


/* =========================
   LOGOUT
========================= */

function logout() {

  localStorage.removeItem(
    "token"
  );

  localStorage.removeItem(
    "user"
  );

  window.location.href =
    "login.html";

}


/* =========================
   START
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    loadBookingHistory();

  }
);