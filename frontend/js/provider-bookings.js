/* =========================================================
   QUICKCONNECT — PROVIDER BOOKINGS
   provider-bookings.js
========================================================= */

const API = "http://localhost:5000/api";

let allBookings = [];
let currentFilter = "all";


/* ========================
   START
======================== */

document.addEventListener("DOMContentLoaded", () => {

  const user =
    JSON.parse(localStorage.getItem("user") || "null");

  const token =
    localStorage.getItem("token");

  if (!token || !user) {
    window.location.href = "login.html";
    return;
  }

  if (
    user.role !== "serviceProvider" &&
    user.role !== "admin"
  ) {
    window.location.href = "index.html";
    return;
  }

  setupFilters();
  loadBookings();

});


/* ========================
   FILTERS
======================== */

function setupFilters() {

  const filters =
    document.querySelectorAll(".booking-filter");

  filters.forEach(button => {

    button.addEventListener("click", () => {

      filters.forEach(btn => {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      currentFilter =
        button.dataset.status || "all";

      renderBookings();

    });

  });

}


/* ========================
   LOAD BOOKINGS
======================== */

async function loadBookings() {

  try {

    const token =
      localStorage.getItem("token");

    if (!token) {
      window.location.href = "login.html";
      return;
    }

    const res =
      await fetch(
        `${API}/bookings/admin/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

    if (
      res.status === 401 ||
      res.status === 403
    ) {

      console.error(
        "Bookings authorization failed:",
        res.status
      );

      showMessage(
        "Unable to access bookings. Please log in again."
      );

      return;

    }

    if (!res.ok) {
      throw new Error("Failed to load bookings");
    }

    const data =
      await res.json();

    allBookings =
      Array.isArray(data)
        ? data
        : [];

    renderBookings();

  }
  catch (err) {

    console.error(
      "LOAD PROVIDER BOOKINGS ERROR:",
      err
    );

    showMessage(
      "Unable to load bookings. Please try refreshing the page."
    );

  }

}


/* ========================
   RENDER BOOKINGS
======================== */

function renderBookings() {

  const container =
    document.getElementById("bookingsContainer");

  if (!container) return;

  container.innerHTML = "";

  let bookings =
    [...allBookings];

  if (currentFilter !== "all") {

    bookings =
      bookings.filter(
        booking =>
          String(
            booking.status || "pending"
          ).toLowerCase() === currentFilter
      );

  }

  bookings =
    bookings.filter(booking => {

      const status =
        String(
          booking.status || "pending"
        ).toLowerCase();

      return [
        "pending",
        "accepted",
        "postponed"
      ].includes(status);

    });


  if (bookings.length === 0) {

    container.innerHTML = `

      <div class="empty-state">

        <i
          class="fa fa-calendar-xmark"
          style="
            font-size:40px;
            margin-bottom:15px;
          "
        ></i>

        <h3>
          No ${
            currentFilter === "all"
              ? "active "
              : currentFilter + " "
          }bookings
        </h3>

        <p>
          Customer bookings will appear here.
        </p>

        <a
          href="booking-history.html"
          class="btn-primary"
          style="
            display:inline-flex;
            align-items:center;
            gap:8px;
            margin-top:15px;
            text-decoration:none;
          "
        >

          <i class="fa fa-clock-rotate-left"></i>

          View Booking History

        </a>

      </div>

    `;

    return;

  }


  bookings.forEach(booking => {

    container.appendChild(
      createBookingCard(booking)
    );

  });

}


/* ========================
   CREATE BOOKING CARD
======================== */

function createBookingCard(booking) {

  const customer =
    booking.user || {};

  const service =
    booking.service || {};

  const status =
    String(
      booking.status || "pending"
    ).toLowerCase();

  const bookingDate =
    booking.bookingDate
      ? new Date(
          booking.bookingDate
        ).toLocaleDateString()
      : "-";

  const bookingTime =
    booking.bookingTime || "-";

  const createdDate =
    booking.createdAt
      ? new Date(
          booking.createdAt
        ).toLocaleDateString()
      : "-";

  const phone =
    booking.customerPhone ||
    customer.phone ||
    customer.cellphone ||
    "-";

  const amount =
    Number(
      booking.price || 0
    ).toLocaleString();

  const payment =
    String(
      booking.paymentMethod || "-"
    ).toUpperCase();

  const card =
    document.createElement("div");

  card.className =
    `service-card booking-card ${status}-card`;


  /* ========================
     PENDING
  ======================== */

  if (status === "pending") {

    card.innerHTML = `

      <div class="booking-header">

        <div>

          <h3>
            ${escapeHtml(
              service.name ||
              "Unknown Service"
            )}
          </h3>

          <p style="
            margin-top:5px;
            color:#94a3b8;
          ">
            New customer booking
          </p>

        </div>

        <span class="status pending">
          Pending
        </span>

      </div>


      <div class="booking-body">

        <div class="booking-info-grid">

          <p>
            <strong>Customer</strong><br>
            ${escapeHtml(
              customer.name || "-"
            )}
          </p>

          <p>
            <strong>Email</strong><br>
            ${escapeHtml(
              customer.email || "-"
            )}
          </p>

          <p>
            <strong>Phone</strong><br>
            ${escapeHtml(phone)}
          </p>

          <p>
            <strong>Amount</strong><br>
            R${amount}
          </p>

          <p>
            <strong>Payment</strong><br>
            ${escapeHtml(payment)}
          </p>

          <p>
            <strong>Booking Date</strong><br>
            ${bookingDate}
          </p>

          <p>
            <strong>Booking Time</strong><br>
            ${escapeHtml(bookingTime)}
          </p>

          <p>
            <strong>Created</strong><br>
            ${createdDate}
          </p>

        </div>

      </div>


      <div class="booking-actions">

        <button
          class="accept-btn"
          type="button"
          onclick="updateBookingStatus(
            '${booking._id}',
            'accepted'
          )"
        >

          <i class="fa fa-check"></i>
          Accept

        </button>


        <button
          class="postpone-btn"
          type="button"
          onclick="postponeBooking(
            '${booking._id}'
          )"
        >

          <i class="fa fa-clock"></i>
          Postpone

        </button>


        <button
          class="decline-btn"
          type="button"
          onclick="updateBookingStatus(
            '${booking._id}',
            'declined'
          )"
        >

          <i class="fa fa-times"></i>
          Decline

        </button>


        <button
          class="details-btn"
          type="button"
          onclick="viewBookingDetails(
            '${booking._id}'
          )"
        >

          <i class="fa fa-eye"></i>
          View Details

        </button>

      </div>

    `;

  }


  /* ========================
     ACCEPTED
  ======================== */

  else if (status === "accepted") {

    card.innerHTML = `

      <div class="booking-header">

        <div>

          <h3>
            ${escapeHtml(
              service.name ||
              "Unknown Service"
            )}
          </h3>

          <p style="
            margin-top:5px;
            color:#94a3b8;
          ">
            ${escapeHtml(
              customer.name || "-"
            )}
          </p>

        </div>

        <span class="status accepted">
          Accepted
        </span>

      </div>


      <div class="booking-body">

        <p>
          <strong>Booking Date:</strong>
          ${bookingDate}
        </p>

        <p>
          <strong>Booking Time:</strong>
          ${escapeHtml(bookingTime)}
        </p>

        <p>
          <strong>Amount:</strong>
          R${amount}
        </p>

        <p>
          <strong>Payment:</strong>
          ${escapeHtml(payment)}
        </p>

      </div>


      <div class="booking-actions">

        <button
          class="complete-btn"
          type="button"
          onclick="updateBookingStatus(
            '${booking._id}',
            'completed'
          )"
        >

          <i class="fa fa-circle-check"></i>
          Complete

        </button>


        <button
          class="details-btn"
          type="button"
          onclick="viewBookingDetails(
            '${booking._id}'
          )"
        >

          <i class="fa fa-eye"></i>
          View Details

        </button>

      </div>

    `;

  }


  /* ========================
     POSTPONED
  ======================== */

  else if (status === "postponed") {

    const postponedDate =
      booking.postponedDate
        ? new Date(
            booking.postponedDate
          ).toLocaleDateString()
        : "Not provided";

    const postponedTime =
      booking.postponedTime ||
      "Not provided";

    const postponedReason =
      booking.postponedReason ||
      "No reason provided";

    card.innerHTML = `

      <div class="booking-header">

        <div>

          <h3>
            ${escapeHtml(
              service.name ||
              "Unknown Service"
            )}
          </h3>

          <p style="
            margin-top:5px;
            color:#94a3b8;
          ">
            ${escapeHtml(
              customer.name || "-"
            )}
          </p>

        </div>

        <span class="status postponed">
          Waiting for Customer
        </span>

      </div>


      <div class="booking-body">

        <div class="postponed-booking-card">

          <div class="postponed-booking-heading">

            <div class="postponed-booking-icon">
              <i class="fa fa-hourglass-half"></i>
            </div>

            <div>

              <h4>
                Reschedule Proposal Sent
              </h4>

              <p>
                The customer must accept this
                new date or request another date.
              </p>

            </div>

          </div>


          <div class="postponed-booking-details">

            <div class="postponed-detail">

              <span>
                <i class="fa fa-calendar"></i>
                Proposed Date
              </span>

              <strong>
                ${escapeHtml(postponedDate)}
              </strong>

            </div>


            <div class="postponed-detail">

              <span>
                <i class="fa fa-clock"></i>
                Proposed Time
              </span>

              <strong>
                ${escapeHtml(postponedTime)}
              </strong>

            </div>


            <div class="postponed-detail postponed-reason">

              <span>
                <i class="fa fa-message"></i>
                Reason
              </span>

              <strong>
                ${escapeHtml(postponedReason)}
              </strong>

            </div>

          </div>

        </div>


        <div class="booking-info-grid postponed-original-info">

          <p>
            <strong>Original Date</strong><br>
            ${bookingDate}
          </p>

          <p>
            <strong>Original Time</strong><br>
            ${escapeHtml(bookingTime)}
          </p>

          <p>
            <strong>Amount</strong><br>
            R${amount}
          </p>

          <p>
            <strong>Payment</strong><br>
            ${escapeHtml(payment)}
          </p>

        </div>


        <div style="
          margin-top:18px;
          padding:14px 16px;
          border-radius:12px;
          background:rgba(245,158,11,0.08);
          border:1px solid rgba(245,158,11,0.20);
          color:#fbbf24;
        ">

          <i class="fa fa-hourglass-half"></i>

          <strong style="margin-left:6px;">
            Waiting for customer response
          </strong>

          <p style="
            margin:7px 0 0;
            color:#94a3b8;
            font-size:13px;
          ">
            The booking will remain here until the
            customer accepts the proposed schedule
            or requests another date.
          </p>

        </div>

      </div>


      <div class="booking-actions">

        <button
          class="details-btn"
          type="button"
          onclick="viewBookingDetails(
            '${booking._id}'
          )"
        >

          <i class="fa fa-eye"></i>
          View Details

        </button>

      </div>

    `;

  }


  return card;

}


/* ========================
   UPDATE STATUS
======================== */

async function updateBookingStatus(
  id,
  status
) {

  let message =
    "Are you sure?";

  if (status === "accepted") {
    message =
      "Accept this booking?";
  }

  if (status === "declined") {
    message =
      "Decline this booking?";
  }

  if (status === "completed") {
    message =
      "Mark this booking as completed?";
  }

  if (!confirm(message)) {
    return;
  }


  try {

    const token =
      localStorage.getItem("token");

    if (!token) {
      window.location.href = "login.html";
      return;
    }


    /* ========================
       USE THE EXISTING BACKEND
       ROUTES

       accepted:
       /admin/:id/accept

       declined:
       /admin/:id/decline

       completed:
       /admin/:id/complete
    ======================== */

    let statusEndpoint = "";

    if (status === "accepted") {

      statusEndpoint =
        `${API}/bookings/admin/${id}/accept`;

    }
    else if (status === "declined") {

      statusEndpoint =
        `${API}/bookings/admin/${id}/decline`;

    }
    else if (status === "completed") {

      statusEndpoint =
        `${API}/bookings/admin/${id}/complete`;

    }
    else {

      alert(
        "Invalid booking status."
      );

      return;

    }


    const body = {};

    if (status === "declined") {

      const reason =
        prompt(
          "Optional: enter a reason for declining this booking:"
        );

      if (reason !== null) {
        body.reason =
          reason.trim();
      }

    }


    const res =
      await fetch(
        statusEndpoint,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`
          },

          body:
            JSON.stringify(body)

        }
      );


    const contentType =
      res.headers.get(
        "content-type"
      ) || "";


    let data = {};

    if (
      contentType.includes(
        "application/json"
      )
    ) {

      data =
        await res.json();

    }
    else {

      const text =
        await res.text();

      console.error(
        "SERVER RETURNED NON-JSON:",
        text
      );

      alert(
        `Server returned an unexpected response (${res.status}). Please check the server routes.`
      );

      return;

    }


    if (!res.ok) {

      alert(
        data.message ||
        "Failed to update booking."
      );

      return;

    }


    alert(
      status === "accepted"
        ? "Booking accepted."
        : status === "declined"
          ? "Booking declined."
          : status === "completed"
            ? "Booking completed."
            : "Booking updated successfully."
    );


    await loadBookings();

  }
  catch (err) {

    console.error(
      "UPDATE BOOKING STATUS ERROR:",
      err
    );

    alert(
      "Server error. Please try again."
    );

  }

}


/* =========================================================
   POSTPONE BOOKING
   Beautiful booking card/modal
========================================================= */

function postponeBooking(id) {

  const existing =
    document.getElementById(
      "postponeBookingOverlay"
    );

  if (existing) {
    existing.remove();
  }

  const booking =
    allBookings.find(
      item => item._id === id
    );

  if (!booking) {

    alert(
      "Booking could not be found."
    );

    return;

  }

  const service =
    booking.service || {};

  const customer =
    booking.user || {};

  const overlay =
    document.createElement("div");

  overlay.id =
    "postponeBookingOverlay";

  overlay.className =
    "postpone-booking-overlay";

  overlay.innerHTML = `

    <div
      class="postpone-booking-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="postponeBookingTitle"
    >

      <button
        type="button"
        class="postpone-close"
        id="closePostponeModal"
        aria-label="Close"
      >
        <i class="fa fa-xmark"></i>
      </button>


      <div class="postpone-modal-header">

        <div class="postpone-icon">
          <i class="fa fa-calendar-days"></i>
        </div>

        <div>

          <span class="postpone-eyebrow">
            Reschedule Booking
          </span>

          <h2 id="postponeBookingTitle">
            Propose a New Date
          </h2>

          <p>
            Give the customer a new date and time
            and explain why the booking needs to be postponed.
          </p>

        </div>

      </div>


      <div class="postpone-booking-summary">

        <div>

          <span>Service</span>

          <strong>
            ${escapeHtml(
              service.name ||
              "Unknown Service"
            )}
          </strong>

        </div>

        <div>

          <span>Customer</span>

          <strong>
            ${escapeHtml(
              customer.name ||
              "-"
            )}
          </strong>

        </div>

      </div>


      <form
        id="postponeBookingForm"
        class="postpone-form"
      >

        <div class="postpone-form-grid">

          <div class="postpone-field">

            <label for="postponedDate">

              <i class="fa fa-calendar"></i>

              New Date

              <span>*</span>

            </label>

            <input
              type="date"
              id="postponedDate"
              required
            >

          </div>


          <div class="postpone-field">

            <label for="postponedTime">

              <i class="fa fa-clock"></i>

              New Time

              <span>*</span>

            </label>

            <input
              type="time"
              id="postponedTime"
              required
            >

          </div>

        </div>


        <div class="postpone-field">

          <label for="postponedReason">

            <i class="fa fa-message"></i>

            Reason for Postponing

            <span>*</span>

          </label>

          <textarea
            id="postponedReason"
            rows="5"
            maxlength="500"
            placeholder="Explain to the customer why you need to postpone this booking..."
            required
          ></textarea>

          <small>
            This reason will be shown to the customer.
          </small>

        </div>


        <div
          id="postponeError"
          class="postpone-error"
          style="display:none;"
        ></div>


        <div class="postpone-actions">

          <button
            type="button"
            class="postpone-cancel-btn"
            id="cancelPostpone"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="postpone-submit-btn"
            id="submitPostpone"
          >

            <i class="fa fa-calendar-plus"></i>

            Propose New Date

          </button>

        </div>

      </form>

    </div>

  `;


  document.body.appendChild(overlay);


  const dateInput =
    document.getElementById(
      "postponedDate"
    );

  const timeInput =
    document.getElementById(
      "postponedTime"
    );

  const reasonInput =
    document.getElementById(
      "postponedReason"
    );

  const form =
    document.getElementById(
      "postponeBookingForm"
    );

  const closeButton =
    document.getElementById(
      "closePostponeModal"
    );

  const cancelButton =
    document.getElementById(
      "cancelPostpone"
    );


  /* Prevent selecting a date in the past */

  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      today.getDate()
    ).padStart(2, "0");

  dateInput.min =
    `${year}-${month}-${day}`;


  function closeModal() {

    overlay.classList.add(
      "closing"
    );

    setTimeout(() => {

      if (overlay.parentNode) {
        overlay.remove();
      }

    }, 180);

  }


  closeButton.addEventListener(
    "click",
    closeModal
  );

  cancelButton.addEventListener(
    "click",
    closeModal
  );


  overlay.addEventListener(
    "click",
    event => {

      if (
        event.target === overlay
      ) {

        closeModal();

      }

    }
  );


  function escapePostpone(event) {

    if (event.key === "Escape") {

      closeModal();

      document.removeEventListener(
        "keydown",
        escapePostpone
      );

    }

  }

  document.addEventListener(
    "keydown",
    escapePostpone
  );


  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const date =
        dateInput.value;

      const time =
        timeInput.value;

      const reason =
        reasonInput.value.trim();

      const error =
        document.getElementById(
          "postponeError"
        );

      const submitButton =
        document.getElementById(
          "submitPostpone"
        );


      if (!date) {

        error.textContent =
          "Please select a new date.";

        error.style.display =
          "block";

        dateInput.focus();

        return;

      }


      if (!time) {

        error.textContent =
          "Please select a new time.";

        error.style.display =
          "block";

        timeInput.focus();

        return;

      }


      if (!reason) {

        error.textContent =
          "Please provide a reason for postponing the booking.";

        error.style.display =
          "block";

        reasonInput.focus();

        return;

      }


      error.style.display =
        "none";


      submitButton.disabled =
        true;

      submitButton.innerHTML = `

        <i class="fa fa-spinner fa-spin"></i>

        Sending Proposal...

      `;


      try {

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {

          window.location.href =
            "login.html";

          return;

        }

        const res = await fetch(
          `${API}/bookings/admin/${id}/postpone`,
          {
            method: "PUT",

            headers: {

              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`

            },

            body: JSON.stringify({

              postponedDate:
                date,

              postponedTime:
                time,

              postponedReason:
                reason

            })

          }
        );


        const contentType =
          res.headers.get(
            "content-type"
          ) || "";


        let data = {};

        if (
          contentType.includes(
            "application/json"
          )
        ) {

          data =
            await res.json();

        }
        else {

          const text =
            await res.text();

          console.error(
            "POSTPONE SERVER RETURNED NON-JSON:",
            text
          );

          error.textContent =
            `Server returned an unexpected response (${res.status}). Please check the server route.`;

          error.style.display =
            "block";

          submitButton.disabled =
            false;

          submitButton.innerHTML = `

            <i class="fa fa-calendar-plus"></i>

            Propose New Date

          `;

          return;

        }


        if (!res.ok) {

          error.textContent =
            data.message ||
            "Failed to postpone booking.";

          error.style.display =
            "block";

          submitButton.disabled =
            false;

          submitButton.innerHTML = `

            <i class="fa fa-calendar-plus"></i>

            Propose New Date

          `;

          return;

        }


        closeModal();


        alert(
          "Booking postponed successfully. The customer can now respond to your new proposed date and time."
        );


        await loadBookings();

      }
      catch (err) {

        console.error(
          "POSTPONE BOOKING ERROR:",
          err
        );

        error.textContent =
          "Server error. Please try again.";

        error.style.display =
          "block";

        submitButton.disabled =
          false;

        submitButton.innerHTML = `

          <i class="fa fa-calendar-plus"></i>

          Propose New Date

        `;

      }

    }
  );


  setTimeout(() => {
    dateInput.focus();
  }, 100);

}


/* ========================
   VIEW DETAILS
======================== */

async function viewBookingDetails(id) {

  const booking =
    allBookings.find(
      item => item._id === id
    );

  if (!booking) {

    alert(
      "Booking details could not be found."
    );

    return;

  }


  const customer =
    booking.user || {};

  const service =
    booking.service || {};

  const bookingDate =
    booking.bookingDate
      ? new Date(
          booking.bookingDate
        ).toLocaleDateString()
      : "-";

  const bookingTime =
    booking.bookingTime || "-";

  const amount =
    Number(
      booking.price || 0
    ).toLocaleString();

  const payment =
    String(
      booking.paymentMethod || "-"
    ).toUpperCase();


  alert(

    `BOOKING DETAILS\n\n` +

    `Service: ${
      service.name || "-"
    }\n\n` +

    `Customer: ${
      customer.name || "-"
    }\n\n` +

    `Email: ${
      customer.email || "-"
    }\n\n` +

    `Phone: ${
      booking.customerPhone ||
      customer.phone ||
      customer.cellphone ||
      "-"
    }\n\n` +

    `Date: ${
      bookingDate
    }\n\n` +

    `Time: ${
      bookingTime
    }\n\n` +

    `Payment: ${
      payment
    }\n\n` +

    `Amount: R${
      amount
    }\n\n` +

    `Status: ${
      booking.status ||
      "pending"
    }`

  );

}


/* ========================
   MESSAGE
======================== */

function showMessage(message) {

  const container =
    document.getElementById(
      "bookingsContainer"
    );

  if (!container) return;


  container.innerHTML = `

    <div class="empty-state">

      <h3>
        Bookings unavailable
      </h3>

      <p>
        ${escapeHtml(message)}
      </p>

      <button
        type="button"
        class="btn-primary"
        onclick="loadBookings()"
        style="
          margin-top:15px;
          display:inline-flex;
          align-items:center;
          gap:8px;
        "
      >

        <i class="fa fa-refresh"></i>

        Try Again

      </button>

    </div>

  `;

}


/* ========================
   ESCAPE HTML
======================== */

function escapeHtml(value) {

  return String(
    value ?? ""
  )

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