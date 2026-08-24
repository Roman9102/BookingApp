import crypto from "crypto";
import User from "../models/user.js";

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

const SUBSCRIPTION_DAYS = 30;
const GRACE_PERIOD_DAYS = 2;


/* =========================
   PAYSTACK WEBHOOK
========================= */

export const paystackWebhook = async (req, res) => {
  try {

    /* =========================
       CHECK SECRET KEY
    ========================== */

    if (!PAYSTACK_SECRET_KEY) {
      console.error(
        "PAYSTACK_SECRET_KEY is missing from .env"
      );

      return res.sendStatus(500);
    }


    /* =========================
       VERIFY PAYSTACK SIGNATURE
    ========================== */

    const signature =
      req.headers["x-paystack-signature"];

    if (!signature) {
      console.error(
        "Paystack webhook signature missing."
      );

      return res.sendStatus(401);
    }

    const rawBody =
      req.rawBody;

    if (!rawBody) {
      console.error(
        "Raw webhook body is missing."
      );

      return res.sendStatus(400);
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha512",
          PAYSTACK_SECRET_KEY
        )
        .update(rawBody)
        .digest("hex");

    const receivedSignature =
      String(signature);

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8"
      );

    const receivedBuffer =
      Buffer.from(
        receivedSignature,
        "utf8"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      console.error(
        "Invalid Paystack webhook signature."
      );

      return res.sendStatus(401);
    }

    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      console.error(
        "Invalid Paystack webhook signature."
      );

      return res.sendStatus(401);
    }


    /* =========================
       PAYSTACK EVENT
    ========================= */

    const event =
      req.body;

    console.log(
      "PAYSTACK WEBHOOK EVENT:",
      event?.event
    );


    /* =========================
       BASIC EVENT CHECK
    ========================== */

    if (!event || !event.event) {
      return res.sendStatus(200);
    }


    /* =========================
       HANDLE SUCCESSFUL PAYMENT
    ========================= */

    if (
      event.event !==
      "charge.success"
    ) {
      /*
       * We acknowledge other Paystack
       * events so Paystack does not keep
       * retrying them.
       */
      return res.sendStatus(200);
    }


    /* =========================
       TRANSACTION
    ========================= */

    const transaction =
      event.data;

    if (!transaction) {
      console.error(
        "Paystack webhook transaction data missing."
      );

      return res.sendStatus(200);
    }


    /* =========================
       TRANSACTION STATUS
    ========================= */

    if (
      transaction.status !==
      "success"
    ) {
      return res.sendStatus(200);
    }


    /* =========================
       METADATA
    ========================= */

    const metadata =
      transaction.metadata || {};

    if (
      metadata.type !==
      "provider_subscription"
    ) {
      return res.sendStatus(200);
    }


    /* =========================
       PROVIDER ID
    ========================= */

    const providerId =
      metadata.providerId;

    if (!providerId) {
      console.error(
        "Provider ID missing from Paystack metadata."
      );

      return res.sendStatus(200);
    }


    /* =========================
       PAYSTACK PLAN CHECK
    ========================= */

    const configuredPlanCode =
      process.env
        .PAYSTACK_SUBSCRIPTION_PLAN_CODE;

    if (!configuredPlanCode) {
      console.error(
        "PAYSTACK_SUBSCRIPTION_PLAN_CODE is missing from .env"
      );

      return res.sendStatus(500);
    }

    if (
      transaction.plan &&
      String(
        transaction.plan
      ) !==
      String(
        configuredPlanCode
      )
    ) {
      console.error(
        "PAYSTACK WEBHOOK PLAN MISMATCH:",
        {
          expected:
            configuredPlanCode,

          received:
            transaction.plan,

          reference:
            transaction.reference
        }
      );

      return res.sendStatus(200);
    }


    /* =========================
       FIND PROVIDER
    ========================= */

    const provider =
      await User.findById(
        providerId
      );

    if (!provider) {
      console.error(
        "Provider not found:",
        providerId
      );

      return res.sendStatus(200);
    }


    /* =========================
       CHECK PROVIDER ROLE
    ========================= */

    if (
      provider.role !==
      "serviceProvider"
    ) {
      return res.sendStatus(200);
    }


    /* =========================
       CHECK PROVIDER PLAN
    ========================= */

    if (
      provider.providerPlan !==
      "subscription"
    ) {
      return res.sendStatus(200);
    }


    /* =========================
       CHECK AMOUNT
    ========================= */

    const subscriptionAmount =
      Number(
        process.env.SUBSCRIPTION_AMOUNT ||
        0
      );

    const expectedAmount =
      Math.round(
        subscriptionAmount * 100
      );

    if (
      !Number.isInteger(
        expectedAmount
      ) ||
      expectedAmount <= 0
    ) {
      console.error(
        "Invalid SUBSCRIPTION_AMOUNT."
      );

      return res.sendStatus(500);
    }

    if (
      Number(
        transaction.amount
      ) !==
      expectedAmount
    ) {
      console.error(
        "PAYSTACK WEBHOOK AMOUNT MISMATCH:",
        {
          expected:
            expectedAmount,

          received:
            transaction.amount,

          reference:
            transaction.reference
        }
      );

      return res.sendStatus(200);
    }


    /* =========================
       PREVENT DUPLICATE PAYMENT
    ========================= */

    if (
      provider.lastSubscriptionReference &&
      provider.lastSubscriptionReference ===
        transaction.reference
    ) {
      console.log(
        "Duplicate Paystack subscription webhook ignored:",
        transaction.reference
      );

      return res.sendStatus(200);
    }


    /* =========================
       CALCULATE SUBSCRIPTION
    ========================= */

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

      const gracePeriodEnd =
        new Date(
          previousExpiry
        );

      gracePeriodEnd.setDate(
        gracePeriodEnd.getDate() +
          GRACE_PERIOD_DAYS
      );

      /*
       * If payment happens while the
       * subscription is active or during
       * the 2-day grace period, extend
       * from the previous expiry date.
       */

      if (
        now <=
        gracePeriodEnd
      ) {
        subscriptionStart =
          previousExpiry;
      }
    }


    /* =========================
       NEW EXPIRY DATE
    ========================= */

    const subscriptionExpires =
      new Date(
        subscriptionStart
      );

    subscriptionExpires.setDate(
      subscriptionExpires.getDate() +
        SUBSCRIPTION_DAYS
    );


    /* =========================
       ACTIVATE SUBSCRIPTION
    ========================= */

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
       SUCCESS LOG
    ========================= */

    console.log(
      "SUBSCRIPTION ACTIVATED:",
      {
        providerId:
          provider._id.toString(),

        customer:
          transaction.customer?.customer_code ||
          transaction.customer?.email ||
          null,

        plan:
          transaction.plan ||
          configuredPlanCode,

        reference:
          transaction.reference,

        amount:
          transaction.amount,

        expiresAt:
          subscriptionExpires
      }
    );


    /* =========================
       SUCCESS
    ========================= */

    return res.sendStatus(200);

  } catch (err) {

    console.error(
      "PAYSTACK WEBHOOK ERROR:",
      err
    );

    return res.sendStatus(500);
  }
};