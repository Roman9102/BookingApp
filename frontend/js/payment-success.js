document.addEventListener("DOMContentLoaded", async () => {

  const loading =
    document.getElementById("paymentLoading");

  const success =
    document.getElementById("paymentSuccess");

  const failed =
    document.getElementById("paymentFailed");

  const errorMessage =
    document.getElementById("paymentError");

  const referenceElement =
    document.getElementById("paymentReference");

  const countdownElement =
    document.getElementById("redirectCountdown");

  const subscriptionStatusMessage =
    document.getElementById(
      "subscriptionStatusMessage"
    );

  const token =
    localStorage.getItem("token");


  /* =========================
     PAYSTACK REFERENCE
  ========================== */

  const params =
    new URLSearchParams(
      window.location.search
    );

  /*
    Paystack may return the reference as
    either "reference" or "trxref".
  */

  const reference =
    params.get("reference") ||
    params.get("trxref");


  console.log(
    "PAYSTACK CALLBACK URL:",
    window.location.href
  );

  console.log(
    "PAYSTACK REFERENCE:",
    reference
  );


  /* =========================
     CHECK REFERENCE
  ========================== */

  if (!reference) {

    if (loading) {
      loading.style.display = "none";
    }

    if (failed) {
      failed.style.display = "block";
    }

    if (errorMessage) {
      errorMessage.textContent =
        "Payment reference was not found.";
    }

    return;
  }


  /* =========================
     CHECK LOGIN
  ========================== */

  if (!token) {

    if (loading) {
      loading.style.display = "none";
    }

    if (failed) {
      failed.style.display = "block";
    }

    if (errorMessage) {
      errorMessage.textContent =
        "Your login session has expired. Please log in again.";
    }

    return;
  }


  /* =========================
     VERIFY PAYMENT
  ========================== */

  try {

    console.log(
      "Verifying Paystack payment..."
    );


    const res =
      await fetch(
        `http://localhost:5000/api/payments/verify/${encodeURIComponent(reference)}`,
        {
          method: "GET",

          headers: {
            "Authorization":
              `Bearer ${token}`
          }
        }
      );


    console.log(
      "VERIFY STATUS:",
      res.status
    );


    let data;

    try {

      data =
        await res.json();

    } catch (jsonError) {

      console.error(
        "Invalid verification response:",
        jsonError
      );

      if (loading) {
        loading.style.display = "none";
      }

      if (failed) {
        failed.style.display = "block";
      }

      if (errorMessage) {
        errorMessage.textContent =
          "The server returned an invalid payment response.";
      }

      return;
    }


    console.log(
      "VERIFY RESPONSE:",
      data
    );


    /* =========================
       STOP LOADING
    ========================== */

    if (loading) {
      loading.style.display = "none";
    }


    /* =========================
       VERIFICATION FAILED
    ========================== */

    if (!res.ok) {

      if (failed) {
        failed.style.display = "block";
      }

      if (errorMessage) {
        errorMessage.textContent =
          data.message ||
          "Payment verification failed.";
      }

      return;
    }


    /* =========================
       PAYMENT NOT PAID
    ========================== */

    if (
      data.paymentStatus !== "paid"
    ) {

      if (failed) {
        failed.style.display = "block";
      }

      if (errorMessage) {
        errorMessage.textContent =
          "Payment could not be confirmed.";
      }

      return;
    }


    /* =========================
       PAYMENT SUCCESS
    ========================== */

    if (success) {
      success.style.display = "block";
    }


    if (referenceElement) {

      referenceElement.textContent =
        `Reference: ${
          data.reference ||
          reference
        }`;

    }


    /* =========================
       SUBSCRIPTION MESSAGE
    ========================== */

    if (
      subscriptionStatusMessage &&
      data.providerPlan ===
        "subscription"
    ) {

      subscriptionStatusMessage.textContent =
        "Your subscription payment has been confirmed.";

    }


    console.log(
      "PAYMENT SUCCESSFULLY VERIFIED"
    );


    /* =========================
       5 SECOND COUNTDOWN
    ========================== */

    let countdown = 5;


    if (countdownElement) {

      countdownElement.textContent =
        countdown;

    }


    const countdownTimer =
      setInterval(() => {

        countdown--;


        if (countdownElement) {

          countdownElement.textContent =
            countdown;

        }


        console.log(
          "Redirecting in:",
          countdown
        );


        if (countdown <= 0) {

          clearInterval(
            countdownTimer
          );


          console.log(
            "REDIRECTING TO HOME..."
          );


          window.location.replace(
            "index.html"
          );

        }

      }, 1000);


  } catch (err) {

    console.error(
      "Payment verification error:",
      err
    );


    if (loading) {
      loading.style.display = "none";
    }


    if (failed) {
      failed.style.display = "block";
    }


    if (errorMessage) {

      errorMessage.textContent =
        "Unable to verify the payment. Please try again.";

    }

  }

});