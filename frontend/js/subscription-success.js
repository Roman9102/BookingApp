document.addEventListener("DOMContentLoaded", async () => {

  const loading =
    document.getElementById(
      "subscriptionLoading"
    );

  const success =
    document.getElementById(
      "subscriptionSuccess"
    );

  const failed =
    document.getElementById(
      "subscriptionFailed"
    );

  const errorMessage =
    document.getElementById(
      "subscriptionError"
    );

  const referenceElement =
    document.getElementById(
      "subscriptionReference"
    );

  const expiryElement =
    document.getElementById(
      "subscriptionExpiry"
    );

  const countdownElement =
    document.getElementById(
      "subscriptionCountdown"
    );


  /* =========================
     GET LOGIN TOKEN
  ========================= */

  const token =
    localStorage.getItem("token");


  /* =========================
     GET PAYSTACK REFERENCE
  ========================= */

  const params =
    new URLSearchParams(
      window.location.search
    );

  /*
    Paystack may return the
    reference as either
    "reference" or "trxref".
  */

  const reference =
    params.get("reference") ||
    params.get("trxref");


  console.log(
    "SUBSCRIPTION CALLBACK URL:",
    window.location.href
  );

  console.log(
    "SUBSCRIPTION REFERENCE:",
    reference
  );


  /* =========================
     CHECK REFERENCE
  ========================= */

  if (!reference) {

    loading.style.display =
      "none";

    failed.style.display =
      "block";

    errorMessage.textContent =
      "Subscription payment reference was not found.";

    return;
  }


  /* =========================
     CHECK LOGIN
  ========================= */

  if (!token) {

    loading.style.display =
      "none";

    failed.style.display =
      "block";

    errorMessage.textContent =
      "Your login session has expired. Please log in again.";

    return;
  }


  /* =========================
     VERIFY SUBSCRIPTION
  ========================= */

  try {

    console.log(
      "Verifying subscription payment..."
    );


    const res =
      await fetch(
        `http://localhost:5000/api/subscriptions/verify/${encodeURIComponent(reference)}`,
        {
          method: "GET",

          headers: {
            "Authorization":
              `Bearer ${token}`
          }
        }
      );


    console.log(
      "SUBSCRIPTION VERIFY STATUS:",
      res.status
    );


    let data;

    try {

      data =
        await res.json();

    } catch (jsonError) {

      console.error(
        "Invalid server response:",
        jsonError
      );

      loading.style.display =
        "none";

      failed.style.display =
        "block";

      errorMessage.textContent =
        "The server returned an invalid response.";

      return;
    }


    console.log(
      "SUBSCRIPTION VERIFY RESPONSE:",
      data
    );


    loading.style.display =
      "none";


    /* =========================
       VERIFICATION FAILED
    ========================= */

    if (!res.ok) {

      failed.style.display =
        "block";

      errorMessage.textContent =
        data.message ||
        "Subscription payment verification failed.";

      return;
    }


    /* =========================
       PAYMENT NOT PAID
    ========================= */

    if (
      data.paymentStatus !==
      "paid"
    ) {

      failed.style.display =
        "block";

      errorMessage.textContent =
        "Subscription payment could not be confirmed.";

      return;
    }


    /* =========================
       SUBSCRIPTION NOT ACTIVE
    ========================= */

    if (
      data.subscriptionStatus !==
      "active"
    ) {

      failed.style.display =
        "block";

      errorMessage.textContent =
        "Payment was received, but the subscription could not be activated.";

      return;
    }


    /* =========================
       PAYMENT SUCCESS
    ========================= */

    success.style.display =
      "block";


    /* =========================
       PAYMENT REFERENCE
    ========================= */

    if (referenceElement) {

      referenceElement.textContent =
        `Reference: ${
          data.reference ||
          reference
        }`;

    }


    /* =========================
       SUBSCRIPTION EXPIRY
    ========================= */

    if (
      expiryElement &&
      data.subscriptionExpiresAt
    ) {

      const expiryDate =
        new Date(
          data.subscriptionExpiresAt
        );

      expiryElement.textContent =
        `Subscription active until: ${expiryDate.toLocaleDateString(
          "en-ZA",
          {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }
        )}`;

    }


    console.log(
      "SUBSCRIPTION SUCCESSFULLY VERIFIED"
    );


    /* =========================
       COUNTDOWN
    ========================= */

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
          "Redirecting to dashboard in:",
          countdown
        );


        if (
          countdown <= 0
        ) {

          clearInterval(
            countdownTimer
          );


          console.log(
            "REDIRECTING TO ADMIN DASHBOARD..."
          );


          window.location.replace(
            "admin.html"
          );

        }

      }, 1000);


  } catch (err) {

    console.error(
      "Subscription verification error:",
      err
    );


    loading.style.display =
      "none";

    failed.style.display =
      "block";

    errorMessage.textContent =
      "Unable to verify the subscription payment. Please try again.";

  }

});