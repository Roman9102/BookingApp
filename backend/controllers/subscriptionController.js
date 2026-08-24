import User from "../models/user.js";

/* =========================
   SUBSCRIPTION CONFIGURATION
========================= */

const SUBSCRIPTION_AMOUNT = Number(
  process.env.SUBSCRIPTION_AMOUNT || 0
);

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const PAYSTACK_SUBSCRIPTION_PLAN_CODE =
  process.env.PAYSTACK_SUBSCRIPTION_PLAN_CODE;

const SUBSCRIPTION_DAYS = 30;
const GRACE_PERIOD_DAYS = 2;


/* =========================
   INITIALIZE SUBSCRIPTION
========================= */

export const initializeSubscription = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message: "Not authorized."
      });
    }

    /* =========================
       CHECK PAYSTACK KEY
    ========================== */

    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing from .env"
      );

      return res.status(500).json({
        message:
          "Paystack secret key is not configured."
      });
    }

    /* =========================
       CHECK PAYSTACK PLAN
    ========================== */

    if (!PAYSTACK_SUBSCRIPTION_PLAN_CODE) {
      console.error(
        "PAYSTACK_SUBSCRIPTION_PLAN_CODE is missing from .env"
      );

      return res.status(500).json({
        message:
          "Paystack subscription plan code is not configured."
      });
    }

    /* =========================
       CHECK SUBSCRIPTION AMOUNT
    ========================== */

    if (
      !Number.isFinite(
        SUBSCRIPTION_AMOUNT
      ) ||
      SUBSCRIPTION_AMOUNT <= 0
    ) {
      console.error(
        "SUBSCRIPTION_AMOUNT is missing or invalid."
      );

      return res.status(500).json({
        message:
          "Subscription amount has not been configured."
      });
    }

    /* =========================
       FIND PROVIDER
    ========================== */

    const provider =
      await User.findById(userId);

    if (!provider) {
      return res.status(404).json({
        message:
          "Service provider not found."
      });
    }

    /* =========================
       CHECK ROLE
    ========================== */

    if (
      provider.role !==
      "serviceProvider"
    ) {
      return res.status(403).json({
        message:
          "Only service providers can purchase a subscription."
      });
    }

    /* =========================
       CHECK PLAN
    ========================== */

    if (
      provider.providerPlan !==
      "subscription"
    ) {
      return res.status(400).json({
        message:
          "This account is not using the Subscription Plan."
      });
    }

    /* =========================
       CHECK ACTIVE + 2 DAY GRACE
    ========================== */

    if (
      provider.subscriptionExpiresAt
    ) {
      const now =
        new Date();

      const expiry =
        new Date(
          provider.subscriptionExpiresAt
        );

      const graceExpiry =
        new Date(expiry);

      graceExpiry.setDate(
        graceExpiry.getDate() +
          GRACE_PERIOD_DAYS
      );

      if (
        provider.subscriptionStatus ===
          "active" &&
        now <= graceExpiry
      ) {
        return res.status(400).json({
          message:
            now <= expiry
              ? "Your subscription is already active."
              : "Your subscription is within the 2-day grace period and is still active."
        });
      }
    }

    /* =========================
       CHECK EMAIL
    ========================== */

    if (!provider.email) {
      return res.status(400).json({
        message:
          "Provider email is required for subscription payment."
      });
    }

    /* =========================
       PAYSTACK AMOUNT

       R79.00 = 7900
    ========================== */

    const paystackAmount =
      Math.round(
        SUBSCRIPTION_AMOUNT * 100
      );

    if (
      !Number.isInteger(
        paystackAmount
      ) ||
      paystackAmount <= 0
    ) {
      return res.status(500).json({
        message:
          "Invalid subscription amount."
      });
    }

    /* =========================
       PAYMENT REFERENCE
    ========================== */

    const reference =
      `QC-SUB-${provider._id}-${Date.now()}`;

    /* =========================
       PAYSTACK SUBSCRIPTION DATA
    ========================== */

    const paymentData = {
      email:
        provider.email,

      amount:
        paystackAmount,

      currency:
        "ZAR",

      reference,

      plan:
        PAYSTACK_SUBSCRIPTION_PLAN_CODE,

      callback_url:
        "https://reviving-tarantula-briskly.ngrok-free.dev/subscription-success.html",

      channels: [
        "card"
      ],

      metadata: {
        type:
          "provider_subscription",

        providerId:
          provider._id.toString(),

        providerPlan:
          "subscription",

        subscriptionPlanCode:
          PAYSTACK_SUBSCRIPTION_PLAN_CODE
      }
    };

    console.log(
      "INITIALIZING PROVIDER SUBSCRIPTION:",
      {
        providerId:
          provider._id.toString(),

        configuredAmount:
          SUBSCRIPTION_AMOUNT,

        paystackAmount,

        plan:
          PAYSTACK_SUBSCRIPTION_PLAN_CODE,

        reference
      }
    );

    /* =========================
       INITIALIZE PAYSTACK
    ========================== */

    const response =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,

            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              paymentData
            )
        }
      );

    const responseText =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(
          responseText
        );
    } catch (parseError) {
      console.error(
        "PAYSTACK INITIALIZE NON-JSON RESPONSE:",
        {
          status:
            response.status,

          contentType:
            response.headers.get(
              "content-type"
            ),

          body:
            responseText.substring(
              0,
              500
            )
        }
      );

      return res.status(502).json({
        message:
          "Paystack returned an invalid response while initializing the subscription."
      });
    }

    console.log(
      "SUBSCRIPTION PAYSTACK RESPONSE:",
      data
    );

    /* =========================
       PAYSTACK ERROR
    ========================== */

    if (
      !response.ok ||
      !data.status ||
      !data.data
    ) {
      console.error(
        "Subscription Paystack initialization error:",
        data
      );

      return res.status(400).json({
        message:
          data.message ||
          "Unable to initialize subscription payment."
      });
    }

    /* =========================
       RESPONSE
    ========================== */

    return res.status(200).json({
      message:
        "Subscription payment initialized successfully.",

      authorization_url:
        data.data.authorization_url,

      access_code:
        data.data.access_code,

      reference:
        data.data.reference
    });

  } catch (err) {
    console.error(
      "Initialize subscription error:",
      err
    );

    return res.status(500).json({
      message:
        err.message ||
        "Unable to initialize subscription payment."
    });
  }
};


/* =========================
   VERIFY SUBSCRIPTION
========================= */

export const verifySubscription = async (
  req,
  res
) => {
  try {
    const {
      reference
    } = req.params;

    if (!reference) {
      return res.status(400).json({
        message:
          "Subscription payment reference is required."
      });
    }

    const userId =
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        message:
          "Not authorized."
      });
    }

    /* =========================
       CHECK PAYSTACK KEY
    ========================== */

    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing from .env"
      );

      return res.status(500).json({
        message:
          "Paystack secret key is not configured."
      });
    }

    /* =========================
       CHECK PAYSTACK PLAN
    ========================== */

    if (!PAYSTACK_SUBSCRIPTION_PLAN_CODE) {
      console.error(
        "PAYSTACK_SUBSCRIPTION_PLAN_CODE is missing from .env"
      );

      return res.status(500).json({
        message:
          "Paystack subscription plan code is not configured."
      });
    }

    /* =========================
       CHECK AMOUNT
    ========================== */

    if (
      !Number.isFinite(
        SUBSCRIPTION_AMOUNT
      ) ||
      SUBSCRIPTION_AMOUNT <= 0
    ) {
      return res.status(500).json({
        message:
          "Subscription amount has not been configured."
      });
    }

    /* =========================
       FIND PROVIDER
    ========================== */

    const provider =
      await User.findById(
        userId
      );

    if (!provider) {
      return res.status(404).json({
        message:
          "Service provider not found."
      });
    }

    /* =========================
       CHECK ROLE
    ========================== */

    if (
      provider.role !==
      "serviceProvider"
    ) {
      return res.status(403).json({
        message:
          "Only service providers can verify subscription payments."
      });
    }

    /* =========================
       CHECK PLAN
    ========================== */

    if (
      provider.providerPlan !==
      "subscription"
    ) {
      return res.status(400).json({
        message:
          "This account is not using the Subscription Plan."
      });
    }

    /* =========================
       VERIFY WITH PAYSTACK
    ========================== */

    const response =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference
        )}`,
        {
          method:
            "GET",

          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,

            Accept:
              "application/json"
          }
        }
      );

    const responseText =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(
          responseText
        );
    } catch (parseError) {
      console.error(
        "PAYSTACK VERIFY NON-JSON RESPONSE:",
        {
          status:
            response.status,

          contentType:
            response.headers.get(
              "content-type"
            ),

          body:
            responseText.substring(
              0,
              500
            ),

          reference
        }
      );

      return res.status(502).json({
        message:
          "Paystack returned an invalid response while verifying the subscription payment."
      });
    }

    console.log(
      "SUBSCRIPTION VERIFY RESPONSE:",
      data
    );

    /* =========================
       PAYSTACK VERIFICATION ERROR
    ========================== */

    if (
      !response.ok ||
      !data.status
    ) {
      return res.status(400).json({
        message:
          data.message ||
          "Subscription payment verification failed."
      });
    }

    /* =========================
       CHECK TRANSACTION
    ========================== */

    const transaction =
      data.data;

    if (
      !transaction ||
      transaction.status !==
        "success"
    ) {
      return res.status(400).json({
        message:
          "Subscription payment was not successful."
      });
    }

    /* =========================
       CHECK REFERENCE
    ========================== */

    if (
      transaction.reference !==
      reference
    ) {
      return res.status(400).json({
        message:
          "Subscription payment reference does not match."
      });
    }

    /* =========================
       CHECK AMOUNT
    ========================== */

    const expectedAmount =
      Math.round(
        SUBSCRIPTION_AMOUNT * 100
      );

    if (
      Number(
        transaction.amount
      ) !==
      expectedAmount
    ) {
      console.error(
        "SUBSCRIPTION AMOUNT MISMATCH:",
        {
          expected:
            expectedAmount,

          received:
            transaction.amount,

          reference
        }
      );

      return res.status(400).json({
        message:
          "Subscription payment amount does not match the required amount."
      });
    }

    /* =========================
       CHECK PAYSTACK PLAN
    ========================== */

    if (
      transaction.plan &&
      String(
        transaction.plan
      ) !==
      String(
        PAYSTACK_SUBSCRIPTION_PLAN_CODE
      )
    ) {
      console.error(
        "SUBSCRIPTION PLAN MISMATCH:",
        {
          expected:
            PAYSTACK_SUBSCRIPTION_PLAN_CODE,

          received:
            transaction.plan,

          reference
        }
      );

      return res.status(400).json({
        message:
          "Subscription payment plan does not match the configured Paystack plan."
      });
    }

    /* =========================
       ACTIVATE / EXTEND
       SUBSCRIPTION
    ========================== */

    const now =
      new Date();

    let subscriptionStart =
      now;

    if (
      provider.subscriptionExpiresAt
    ) {
      const previousExpiry =
        new Date(
          provider.subscriptionExpiresAt
        );

      const graceExpiry =
        new Date(
          previousExpiry
        );

      graceExpiry.setDate(
        graceExpiry.getDate() +
          GRACE_PERIOD_DAYS
      );

      if (
        now <= graceExpiry
      ) {
        subscriptionStart =
          previousExpiry;
      }
    }

    const subscriptionExpires =
      new Date(
        subscriptionStart
      );

    subscriptionExpires.setDate(
      subscriptionExpires.getDate() +
        SUBSCRIPTION_DAYS
    );

    provider.subscriptionStatus =
      "active";

    provider.subscriptionExpiresAt =
      subscriptionExpires;

    provider.lastSubscriptionReference =
      transaction.reference;

    provider.lastSubscriptionPaymentAt =
      now;

    await provider.save();

    /* =========================
       SUCCESS RESPONSE
    ========================== */

    return res.status(200).json({
      message:
        "Subscription payment verified successfully.",

      paymentStatus:
        "paid",

      subscriptionStatus:
        provider.subscriptionStatus,

      subscriptionExpiresAt:
        provider.subscriptionExpiresAt,

      reference:
        transaction.reference
    });

  } catch (err) {
    console.error(
      "Verify subscription error:",
      err
    );

    return res.status(500).json({
      message:
        err.message ||
        "Unable to verify subscription payment."
    });
  }
};