document.addEventListener("DOMContentLoaded", () => {

  console.log("REGISTER JS IS RUNNING");

  const form = document.getElementById("registerForm");

  if (!form) {
    console.error("Registration form not found.");
    return;
  }

  const roleInputs = document.querySelectorAll(
    'input[name="role"]'
  );

  const providerPlanSection =
    document.getElementById("providerPlanSection");

  const password =
    document.getElementById("password");

  const passwordRequirements =
    document.getElementById("passwordRequirements");


  /* =========================
     SHOW / HIDE PROVIDER OPTIONS
  ========================== */

  const updateProviderOptions = () => {

    const selectedRole =
      document.querySelector(
        'input[name="role"]:checked'
      )?.value;

    const isProvider =
      selectedRole === "serviceProvider";

    if (providerPlanSection) {
      providerPlanSection.style.display =
        isProvider ? "block" : "none";
    }

    if (!isProvider) {

      document
        .querySelectorAll(
          'input[name="providerPlan"]'
        )
        .forEach((input) => {
          input.checked = false;
        });

      const terms =
        document.getElementById(
          "paymentTermsAccepted"
        );

      if (terms) {
        terms.checked = false;
      }
    }
  };


  roleInputs.forEach((input) => {

    input.addEventListener(
      "change",
      updateProviderOptions
    );

  });

  updateProviderOptions();


  /* =========================
     PASSWORD REQUIREMENTS
  ========================== */

  if (password) {

    password.addEventListener(
      "focus",
      () => {

        if (passwordRequirements) {
          passwordRequirements.style.display =
            "block";
        }

      }
    );


    password.addEventListener(
      "input",
      () => {

        const value =
          password.value;

        const strong =
          value.length >= 8 &&
          /[A-Z]/.test(value) &&
          /[a-z]/.test(value) &&
          /[0-9]/.test(value) &&
          /[^A-Za-z0-9]/.test(value);

        if (passwordRequirements) {

          passwordRequirements.style.display =
            strong ? "none" : "block";

        }

      }
    );

  }


  /* =========================
     REGISTER
  ========================== */

  form.addEventListener(
    "submit",
    async (e) => {

      e.preventDefault();

      console.log("REGISTER FORM SUBMITTED");


      const nameInput =
        document.getElementById("name");

      const emailInput =
        document.getElementById("email");


      if (
        !nameInput ||
        !emailInput ||
        !password
      ) {

        alert(
          "Registration form fields are missing."
        );

        return;
      }


      const name =
        nameInput.value.trim();

      const email =
        emailInput.value.trim();

      const passwordValue =
        password.value;

      const role =
        document.querySelector(
          'input[name="role"]:checked'
        )?.value;


      /* =========================
         BASIC VALIDATION
      ========================== */

      if (!name) {

        alert(
          "Please enter your full name."
        );

        nameInput.focus();

        return;
      }


      if (!email) {

        alert(
          "Please enter your email address."
        );

        emailInput.focus();

        return;
      }


      if (!role) {

        alert(
          "Please choose an account type."
        );

        return;
      }


      /* =========================
         STRONG PASSWORD
      ========================== */

      const strongPassword =
        passwordValue.length >= 8 &&
        /[A-Z]/.test(passwordValue) &&
        /[a-z]/.test(passwordValue) &&
        /[0-9]/.test(passwordValue) &&
        /[^A-Za-z0-9]/.test(passwordValue);


      if (!strongPassword) {

        alert(
          "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
        );

        password.focus();

        return;
      }


      /* =========================
         PROVIDER DETAILS
      ========================== */

      let providerPlan = null;

      let paymentTermsAccepted = false;


      if (
        role === "serviceProvider"
      ) {

        providerPlan =
          document.querySelector(
            'input[name="providerPlan"]:checked'
          )?.value || null;


        paymentTermsAccepted =
          document.getElementById(
            "paymentTermsAccepted"
          )?.checked || false;


        if (
          providerPlan !==
            "subscription" &&
          providerPlan !==
            "commission"
        ) {

          alert(
            "Please choose a provider payment plan."
          );

          return;
        }


        if (!paymentTermsAccepted) {

          alert(
            "Please accept the payment terms before registering as a service provider."
          );

          return;
        }

      }


      /* =========================
         REGISTER REQUEST
      ========================== */

      try {

        console.log(
          "REGISTERING USER:",
          {
            name,
            email,
            role,
            providerPlan,
            paymentTermsAccepted
          }
        );


        const res =
          await fetch(
            "https://quickconnect-api-m617.onrender.com/api/auth/register",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  name,

                  email,

                  password:
                    passwordValue,

                  role,

                  providerPlan,

                  paymentTermsAccepted

                })

            }
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

          alert(
            "The server returned an invalid response."
          );

          return;
        }


        console.log(
          "REGISTER RESPONSE:",
          data
        );


        /* =========================
           REGISTRATION FAILED
        ========================== */

        if (!res.ok) {

          alert(
            data.message ||
            "Registration failed."
          );

          return;
        }


        /* =========================
           CHECK RESPONSE
        ========================== */

        if (
          !data.token ||
          !data.user
        ) {

          console.error(
            "Invalid registration response:",
            data
          );

          alert(
            "Registration completed, but the login session could not be created."
          );

          return;
        }


        /* =========================
           STORE SESSION
        ========================== */

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );


        console.log(
          "REGISTRATION SUCCESSFUL:",
          data.user
        );


        /* =========================
           SERVICE PROVIDER
        ========================== */

        if (
          data.user.role ===
          "serviceProvider"
        ) {


          /* =========================
             SUBSCRIPTION PLAN
          ========================== */

          if (
            data.user.providerPlan ===
            "subscription"
          ) {

            console.log(
              "SUBSCRIPTION PLAN SELECTED"
            );


            try {

              const subscriptionRes =
                await fetch(
                  "https://quickconnect-api-m617.onrender.com/api/subscriptions/initialize",
                  {
                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json",

                      "Authorization":
                        `Bearer ${data.token}`
                    }
                  }
                );


              let subscriptionData;


              try {

                subscriptionData =
                  await subscriptionRes.json();

              } catch (subscriptionJsonError) {

                console.error(
                  "Invalid subscription response:",
                  subscriptionJsonError
                );

                alert(
                  "Unable to start the subscription payment."
                );

                return;
              }


              console.log(
                "SUBSCRIPTION RESPONSE:",
                subscriptionData
              );


              if (
                !subscriptionRes.ok
              ) {

                alert(
                  subscriptionData.message ||
                  "Unable to initialize subscription payment."
                );

                return;
              }


              if (
                !subscriptionData.authorization_url
              ) {

                console.error(
                  "Missing Paystack authorization URL:",
                  subscriptionData
                );

                alert(
                  "Paystack payment could not be started."
                );

                return;
              }


              /* =========================
                 GO TO PAYSTACK
              ========================== */

              console.log(
                "REDIRECTING TO PAYSTACK:",
                subscriptionData.authorization_url
              );


              window.location.href =
                subscriptionData.authorization_url;


              return;

            } catch (subscriptionError) {

              console.error(
                "Subscription initialization error:",
                subscriptionError
              );

              alert(
                "Unable to start the subscription payment. Please try again."
              );

              return;
            }

          }


          /* =========================
             COMMISSION PLAN
          ========================== */

          if (
            data.user.providerPlan ===
            "commission"
          ) {

            console.log(
              "COMMISSION PLAN SELECTED"
            );

            window.location.href =
              "admin.html";

            return;
          }


          /* =========================
             FALLBACK PROVIDER
          ========================== */

          window.location.href =
            "admin.html";

          return;
        }


        /* =========================
           NORMAL USER
        ========================== */

        window.location.href =
          "index.html";


      } catch (err) {

        console.error(
          "Registration error:",
          err
        );

        alert(
          "Server error. Please try again."
        );

      }

    }
  );

});