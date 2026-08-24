const myBookingsContainer =
  document.getElementById("myBookingsList");

const token =
  localStorage.getItem("token");

/* =========================
   LOAD MY BOOKINGS
========================= */

async function loadMyBookings() {
  try {
    const res = await fetch(
      "http://quickconnect-api-m617.onrender.com/api/bookings/my",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!res.ok) {
      throw new Error("Failed to load bookings");
    }

    const bookings = await res.json();

    if (!Array.isArray(bookings)) {
      throw new Error("Invalid bookings response");
    }

    if (!myBookingsContainer) {
      return;
    }

    if (bookings.length === 0) {
      myBookingsContainer.innerHTML =
        "<p>No active bookings found.</p>";
      return;
    }

    myBookingsContainer.innerHTML =
      bookings
        .map((b) => {

          const status =
            String(
              b.status || "pending"
            ).toLowerCase();

          const serviceName =
            b.service?.name ||
            "Service";

          const bookingDate =
            b.bookingDate
              ? new Date(
                  b.bookingDate
                ).toLocaleDateString()
              : "N/A";

          const bookingTime =
            b.bookingTime ||
            "N/A";

          let postponedSection = "";

          /* =========================
             POSTPONED BOOKING
          ========================= */

          if (
            status === "postponed" ||
            status === "reschedule_pending"
          ) {

            const postponedDate =
              b.postponedDate
                ? new Date(
                    b.postponedDate
                  ).toLocaleDateString()
                : "Not provided";

            const postponedTime =
              b.postponedTime ||
              "Not provided";

            const reason =
              b.postponedReason ||
              "No reason provided";

            const response =
              String(
                b.postponedResponse ||
                "pending"
              ).toLowerCase();

            /* =========================
               WAITING FOR CUSTOMER
            ========================= */

            if (response === "pending") {

              postponedSection = `
                <div
                  class="postponed-booking"
                  style="
                    margin-top:15px;
                    padding:15px;
                    border-radius:12px;
                    background:rgba(245,158,11,.15);
                    border:1px solid #f59e0b;
                  "
                >

                  <p>
                    <strong>
                      Your provider proposed a new date and time.
                    </strong>
                  </p>

                  <p style="margin-top:10px;">
                    <strong>New Date:</strong><br>
                    ${escapeHtml(postponedDate)}
                  </p>

                  <p style="margin-top:10px;">
                    <strong>New Time:</strong><br>
                    ${escapeHtml(postponedTime)}
                  </p>

                  <p style="margin-top:10px;">
                    <strong>Reason:</strong><br>
                    ${escapeHtml(reason)}
                  </p>

                  <p style="
                    margin-top:12px;
                    color:#f59e0b;
                    font-size:13px;
                  ">
                    <i class="fa fa-hourglass-half"></i>
                    Please choose whether to accept this
                    new schedule or request another date.
                  </p>

                  <div
                    style="
                      display:flex;
                      gap:10px;
                      margin-top:15px;
                      flex-wrap:wrap;
                    "
                  >

                    <button
                      type="button"
                      onclick="respondToPostponedBooking(
                        '${b._id}',
                        'approved'
                      )"
                      style="
                        padding:10px 16px;
                        border:none;
                        border-radius:8px;
                        background:#22c55e;
                        color:white;
                        font-weight:600;
                        cursor:pointer;
                      "
                    >

                      <i class="fa fa-check"></i>

                      Accept New Date

                    </button>


                    <button
                      type="button"
                      onclick="respondToPostponedBooking(
                        '${b._id}',
                        'rebook'
                      )"
                      style="
                        padding:10px 16px;
                        border:none;
                        border-radius:8px;
                        background:#ef4444;
                        color:white;
                        font-weight:600;
                        cursor:pointer;
                      "
                    >

                      <i class="fa fa-calendar-plus"></i>

                      Request Another Date

                    </button>

                  </div>

                </div>
              `;

            }

            /* =========================
               CUSTOMER ACCEPTED
            ========================= */

            else if (
              response === "approved" ||
              response === "accepted"
            ) {

              postponedSection = `
                <div
                  style="
                    margin-top:15px;
                    padding:15px;
                    border-radius:12px;
                    background:rgba(34,197,94,.15);
                    border:1px solid #22c55e;
                  "
                >

                  <p style="color:#22c55e;">
                    <strong>
                      <i class="fa fa-circle-check"></i>
                      New booking date accepted.
                    </strong>
                  </p>

                  <p style="margin-top:10px;">
                    <strong>Date:</strong>
                    ${escapeHtml(postponedDate)}
                  </p>

                  <p style="margin-top:10px;">
                    <strong>Time:</strong>
                    ${escapeHtml(postponedTime)}
                  </p>

                  <p style="
                    margin-top:10px;
                    color:#94a3b8;
                  ">
                    Your provider has been notified.
                    Your booking is now scheduled for
                    the new date and time.
                  </p>

                </div>
              `;

            }

            /* =========================
               CUSTOMER REQUESTED
               ANOTHER DATE
            ========================= */

            else if (
              response === "rebook" ||
              response === "requested" ||
              b.rebookRequested === true
            ) {

              postponedSection = `
                <div
                  style="
                    margin-top:15px;
                    padding:15px;
                    border-radius:12px;
                    background:rgba(239,68,68,.15);
                    border:1px solid #ef4444;
                  "
                >

                  <p style="color:#ef4444;">
                    <strong>
                      <i class="fa fa-calendar-plus"></i>
                      Another date requested.
                    </strong>
                  </p>

                  <p style="
                    margin-top:10px;
                    color:#94a3b8;
                  ">
                    Your provider has been notified that
                    you need another date and time.
                  </p>

                  <p style="
                    margin-top:10px;
                    color:#94a3b8;
                  ">
                    Please wait for your provider to
                    propose a new schedule.
                  </p>

                </div>
              `;

            }

          }

          return `
            <div class="card">

              <h4>
                ${escapeHtml(serviceName)}
              </h4>

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
                ${escapeHtml(
                  b.paymentMethod || "N/A"
                )}
              </p>

              <p
                class="status-${escapeHtml(status)}"
              >
                <strong>Status:</strong>
                ${escapeHtml(status)}
              </p>

              ${
                status === "accepted"
                  ? `
                    <p style="color:#22c55e;">
                      <strong>
                        ✓ Your booking has been accepted.
                      </strong>
                    </p>
                  `
                  : ""
              }

              ${
                status === "postponed" ||
                status === "reschedule_pending"
                  ? postponedSection
                  : ""
              }

              ${
                status === "reschedule_requested"
                  ? `
                    <div
                      style="
                        margin-top:15px;
                        padding:15px;
                        border-radius:12px;
                        background:rgba(245,158,11,.15);
                        border:1px solid #f59e0b;
                      "
                    >

                      <p style="color:#f59e0b;">
                        <strong>
                          <i class="fa fa-hourglass-half"></i>
                          Waiting for provider
                        </strong>
                      </p>

                      <p style="
                        margin-top:8px;
                        color:#94a3b8;
                      ">
                        You requested another date.
                        Your provider will need to propose
                        a new date and time.
                      </p>

                    </div>
                  `
                  : ""
              }

            </div>
          `;
        })
        .join("");

  } catch (err) {

    console.error(
      "LOAD MY BOOKINGS ERROR:",
      err
    );

    if (myBookingsContainer) {
      myBookingsContainer.innerHTML =
        "<p>Failed to load bookings.</p>";
    }
  }
}


/* =========================
   RESPOND TO POSTPONED
   BOOKING
========================= */

async function respondToPostponedBooking(
  bookingId,
  response
) {

  const message =
    response === "approved"
      ? "Accept the new date and time?"
      : "Request another booking date?";

  if (!confirm(message)) {
    return;
  }

  try {

    const currentToken =
      localStorage.getItem("token");

    if (!currentToken) {

      alert(
        "Your session has expired. Please log in again."
      );

      window.location.href =
        "login.html";

      return;

    }

    const res = await fetch(
      `http://quickconnect-api-m617.onrender.com/api/bookings/${bookingId}/postponed-response`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${currentToken}`
        },

        body: JSON.stringify({
          response
        })
      }
    );

    const data =
      await res.json();

    if (!res.ok) {

      alert(
        data.message ||
        "Failed to update booking."
      );

      return;
    }

    alert(
      data.message ||
      (
        response === "approved"
          ? "New booking date accepted."
          : "Another date has been requested."
      )
    );

    await loadMyBookings();

  } catch (err) {

    console.error(
      "POSTPONED RESPONSE ERROR:",
      err
    );

    alert(
      "Server error. Please try again."
    );
  }
}


/* =========================
   ESCAPE HTML
========================= */

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


/* =========================
   START
========================= */

loadMyBookings();