const bookingForm = document.getElementById("bookingForm");
const serviceSelect = document.getElementById("service");

const user = JSON.parse(localStorage.getItem("user") || "null");

let services = [];

/* ========================
   OPTIONAL ROLE BLOCK
======================== */
if (user && user.role === "serviceProvider") {
  console.log("Service providers should not book services.");
}


/* ========================
   LOAD USER DETAILS
======================== */
function loadUserDetails() {

  if (!user) return;

  document.getElementById("customerName").value =
    user.name || "";

  document.getElementById("customerEmail").value =
    user.email || "";

  document.getElementById("customerPhone").value =
    user.phone || "";

}

/* ========================
   LOAD SERVICES
======================== */
async function populateServices() {

  try {

    const res = await fetch(
      "https://quickconnect-api-m617.onrender.com/api/services"
    );

    services = await res.json();

    serviceSelect.innerHTML =
      '<option value="">Select Service</option>';

    services.forEach(service => {

      const option = document.createElement("option");

      option.value = service._id;

      option.textContent = service.name;

      serviceSelect.appendChild(option);

    });

    serviceSelect.addEventListener(
      "change",
      updateServiceDetails
    );

    document
      .getElementById("location")
      .addEventListener(
        "change",
        updateLocationFields
      );

    /* ========================
       PRESELECT SERVICE
    ======================== */

    const params = new URLSearchParams(window.location.search);

    const selectedService = params.get("service");

    if (selectedService) {

      serviceSelect.value = selectedService;

      updateServiceDetails();

    }

  } catch (err) {

    console.error(err);

  }

}

/* ========================
   UPDATE SERVICE DETAILS
======================== */
function updateServiceDetails() {

  const selectedService = services.find(
    s => s._id === serviceSelect.value
  );

  if (!selectedService) {

    document.getElementById("summaryService").textContent = "-";
    document.getElementById("summaryCategory").textContent = "-";
    document.getElementById("summaryProvider").textContent = "-";
    document.getElementById("summaryLocation").textContent = "-";
    document.getElementById("summaryMode").textContent = "-";
    document.getElementById("summaryPrice").textContent = "R0.00";

    document.getElementById("summaryDate").textContent = "-";
    document.getElementById("summaryTime").textContent = "-";
    document.getElementById("summaryPayment").textContent = "-";
    document.getElementById("summaryStatus").textContent = "Pending";

    document.getElementById("serviceLocation").value = "";

    return;

  }

  document.getElementById("summaryService").textContent =
    selectedService.name || "-";

  document.getElementById("summaryCategory").textContent =
    selectedService.category || "General";

  document.getElementById("summaryProvider").textContent =
    selectedService.providerName || "Service Provider";

  document.getElementById("summaryLocation").textContent =
    selectedService.storeLocation || "-";

  document.getElementById("summaryMode").textContent =
    Array.isArray(selectedService.serviceMode)
      ? selectedService.serviceMode.join(", ")
      : (selectedService.serviceMode || "-");

  document.getElementById("summaryPrice").textContent =
    `R${Number(selectedService.price || 0).toFixed(2)}`;

  document.getElementById("summaryDate").textContent =
    document.getElementById("date").value || "-";

  document.getElementById("summaryTime").textContent =
    document.getElementById("bookingTime").value || "-";

  document.getElementById("summaryPayment").textContent =
    document.getElementById("paymentMethod").value || "-";

  document.getElementById("summaryStatus").textContent =
    "Pending";

  updateLocationFields();

}
/* ========================
   UPDATE LOCATION FIELDS
======================== */
function updateLocationFields() {

  const bookingType =
    document.getElementById("location").value;

  const selectedService = services.find(
    s => s._id === serviceSelect.value
  );

  const locationLabel =
    document.getElementById("locationLabel");

  const locationInput =
    document.getElementById("serviceLocation");

  const locationHint =
    document.getElementById("locationHint");

  if (!locationInput) return;

  if (bookingType === "store") {

    locationLabel.innerHTML =
      'Store Location <span style="color:#ef4444;">*</span>';

    locationInput.value =
      selectedService?.storeLocation || "";

    locationInput.readOnly = true;

    locationInput.placeholder =
      "Store location";

    locationHint.textContent =
      "This is the service provider's store location.";

    document.getElementById("summaryLocation").textContent =
      locationInput.value || "-";

  }

  else if (bookingType === "mobile") {

    locationLabel.innerHTML =
      'Your Location <span style="color:#ef4444;">*</span>';

    locationInput.value = "";

    locationInput.readOnly = false;

    locationInput.placeholder =
      "Enter your full address";

    locationHint.textContent =
      "Enter the address where you want the service to be provided.";

    document.getElementById("summaryLocation").textContent =
      "-";

  }

  else {

    locationLabel.innerHTML =
      'Location <span style="color:#ef4444;">*</span>';

    locationInput.value = "";

    locationInput.readOnly = false;

    locationInput.placeholder =
      "Select a booking type first";

    locationHint.textContent =
      "Choose a booking type first.";

    document.getElementById("summaryLocation").textContent =
      "-";

  }

}
/* ========================
   BOOKING SUBMIT
======================== */
if (bookingForm) {

  bookingForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    console.log("BOOK BUTTON CLICKED");

    const serviceId =
      serviceSelect.value;

    const bookingDate =
      document.getElementById("date").value;

    const bookingTime =
      document.getElementById("bookingTime").value;

    const bookingType =
      document.getElementById("location").value;

    const serviceLocation =
      document.getElementById("serviceLocation").value;

    const paymentMethod =
      document.getElementById("paymentMethod").value;

    const notes =
      document.getElementById("notes").value;

    const customerPhone =
      document.getElementById("customerPhone").value;

    const token =
      localStorage.getItem("token");

    console.log({
      serviceId,
      bookingDate,
      bookingTime,
      bookingType,
      serviceLocation,
      paymentMethod,
      notes,
      customerPhone,
      token
    });

    /* ---------- VALIDATION ---------- */

    if (!serviceId) {
      alert("Please select a service.");
      return;
    }

    if (!bookingDate) {
      alert("Please select a booking date.");
      return;
    }

    if (!bookingTime) {
      alert("Please select a booking time.");
      return;
    }

    if (!bookingType) {
      alert("Please select the booking type.");
      return;
    }

    if (!serviceLocation.trim()) {
      alert("Please enter the service location.");
      document.getElementById("serviceLocation").focus();
      return;
    }

    if (!paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    if (!token) {
      alert("Please login before making a booking.");
      window.location.href = "login.html";
      return;
    }

    const bookingData = {

      service: serviceId,

      bookingDate: bookingDate,

      bookingTime: bookingTime,

      location: bookingType,

      serviceLocation: serviceLocation,

      paymentMethod: paymentMethod,

      notes: notes,

      customerPhone: customerPhone

    };

    console.log(
      "BOOKING DATA:",
      bookingData
    );

    try {

      /* ========================
         CREATE BOOKING
      ======================== */

      console.log(
        "Sending booking request..."
      );

      const res = await fetch(
        "https://quickconnect-api-m617.onrender.com/api/bookings",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Authorization":
              `Bearer ${token}`
          },

          body:
            JSON.stringify(bookingData)
        }
      );

      console.log(
        "BOOKING STATUS:",
        res.status
      );

      const data =
        await res.json();

      console.log(
        "BOOKING RESPONSE:",
        data
      );

      if (!res.ok) {

        alert(
          data.message ||
          "Booking failed."
        );

        return;
      }

      /* ========================
         CARD PAYMENT
      ======================== */

      if (paymentMethod === "card") {

        const bookingId =
          data.booking?._id;

        if (!bookingId) {

          console.error(
            "Booking ID missing:",
            data
          );

          alert(
            "Booking was created, but payment could not be started."
          );

          return;
        }

        console.log(
          "Initializing Paystack payment..."
        );

        const paymentRes =
          await fetch(
            "https://quickconnect-api-m617.onrender.com/api/payments/initialize",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",

                "Authorization":
                  `Bearer ${token}`
              },

              body:
                JSON.stringify({
                  bookingId:
                    bookingId
                })
            }
          );

        console.log(
          "PAYMENT STATUS:",
          paymentRes.status
        );

        const paymentData =
          await paymentRes.json();

        console.log(
          "PAYMENT RESPONSE:",
          paymentData
        );

        if (!paymentRes.ok) {

          alert(
            paymentData.message ||
            "Unable to start card payment."
          );

          return;
        }

        if (
          !paymentData.authorization_url
        ) {

          alert(
            "Paystack checkout URL was not returned."
          );

          return;
        }

        /*
          Send customer to Paystack
          test checkout.
        */

        window.location.href =
          paymentData.authorization_url;

        return;
      }

      /* ========================
         CASH / EFT
      ======================== */

      alert(
        "Booking created successfully!"
      );

      bookingForm.reset();

      loadUserDetails();

      document.getElementById(
        "summaryService"
      ).textContent = "-";

      document.getElementById(
        "summaryCategory"
      ).textContent = "-";

      document.getElementById(
        "summaryProvider"
      ).textContent = "-";

      document.getElementById(
        "summaryLocation"
      ).textContent = "-";

      document.getElementById(
        "summaryMode"
      ).textContent = "-";

      document.getElementById(
        "summaryPrice"
      ).textContent = "R0.00";

    } catch (err) {

      console.error(
        "BOOKING/PAYMENT ERROR:",
        err
      );

      alert(
        "Server error. Please try again."
      );

    }

  });

}
/* ========================
   UPDATE BOOKING SUMMARY
======================== */
function updateBookingSummary() {

  const bookingType =
    document.getElementById("location").value;

  document.getElementById("summaryDate").textContent =
    document.getElementById("date").value || "-";

  document.getElementById("summaryTime").textContent =
    document.getElementById("bookingTime").value || "-";

  document.getElementById("summaryPayment").textContent =
    document.getElementById("paymentMethod").value || "-";

  document.getElementById("summaryStatus").textContent =
    "Pending";

  if (bookingType === "mobile") {

    document.getElementById("summaryLocation").textContent =
      document.getElementById("serviceLocation").value || "-";

  }

}

/* ---------- SUMMARY LISTENERS ---------- */

document.getElementById("date")
  .addEventListener("change", updateBookingSummary);

document.getElementById("bookingTime")
  .addEventListener("change", updateBookingSummary);

document.getElementById("paymentMethod")
  .addEventListener("change", updateBookingSummary);

document.getElementById("location")
  .addEventListener("change", updateBookingSummary);

document.getElementById("serviceLocation")
  .addEventListener("input", updateBookingSummary);

/* ========================
   INITIALIZE
======================== */
loadUserDetails();
populateServices();