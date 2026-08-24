import Booking from "../models/booking.js";
import User from "../models/user.js";

/* =========================
   COMMISSION CONFIGURATION
========================= */

/*
   Change ONLY this percentage when
   you want to change your QC commission.

   Providers will only see the percentage,
   not money examples.
*/

const COMMISSION_PERCENTAGE = Number(
  process.env.COMMISSION_PERCENTAGE || 12
);


/* =========================
   INITIALIZE PAYSTACK PAYMENT
========================= */

export const initializePayment = async (req, res) => {

  try {

    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        message:
          "Booking ID is required"
      });
    }


    /* =========================
       FIND BOOKING
    ========================= */

    const booking =
      await Booking.findById(
        bookingId
      )
        .populate("service")
        .populate(
          "user",
          "name email"
        );


    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }


    /* =========================
       CHECK BOOKING OWNER
    ========================= */

    if (
      booking.user._id.toString() !==
      req.user._id.toString()
    ) {

      return res.status(403).json({
        message:
          "Not authorized to pay for this booking"
      });
    }


    /* =========================
       CARD ONLY
    ========================= */

    if (
      booking.paymentMethod !==
      "card"
    ) {

      return res.status(400).json({
        message:
          "This booking is not using card payment"
      });
    }


    /* =========================
       PREVENT DOUBLE PAYMENT
    ========================= */

    if (
      booking.paymentStatus ===
      "paid"
    ) {

      return res.status(400).json({
        message:
          "This booking has already been paid"
      });
    }


    /* =========================
       BOOKING AMOUNT
    ========================= */

    const amount =
      Number(
        booking.price || 0
      );


    if (amount <= 0) {

      return res.status(400).json({
        message:
          "Invalid booking amount"
      });
    }


    /* =========================
       CUSTOMER EMAIL
    ========================= */

    const email =
      booking.customerEmail ||
      booking.user.email;


    if (!email) {

      return res.status(400).json({
        message:
          "Customer email is required for payment"
      });
    }


    /* =========================
       FIND SERVICE PROVIDER
    ========================= */

    const providerId =
      booking.service?.provider;


    if (!providerId) {

      return res.status(400).json({
        message:
          "This service is not linked to a service provider."
      });
    }


    const provider =
      await User.findById(
        providerId
      );


    if (!provider) {

      return res.status(404).json({
        message:
          "Service provider not found."
      });
    }


    if (
      provider.role !==
      "serviceProvider"
    ) {

      return res.status(400).json({
        message:
          "Invalid service provider account."
      });
    }


    /* =========================
       CHECK PROVIDER PLAN
    ========================= */

    const providerPlan =
      provider.providerPlan;


    if (
      providerPlan !==
        "subscription" &&
      providerPlan !==
        "commission"
    ) {

      return res.status(400).json({
        message:
          "The service provider has not selected a valid payment plan."
      });
    }


    /* =========================
       SUBSCRIPTION PLAN
    ========================= */

    if (
      providerPlan ===
      "subscription"
    ) {

      /*
         Card payment is allowed.

         No commission split is created.

         The payment goes to the
         QuickConnect Paystack account
         unless your subscription payout
         architecture later routes it
         directly to the provider.
      */

      console.log(
        "PAYMENT PLAN: SUBSCRIPTION"
      );

      console.log(
        "PAYSTACK SPLIT: NONE"
      );
    }


    /* =========================
       COMMISSION PLAN
    ========================= */

    if (
      providerPlan ===
      "commission"
    ) {

      /*
         Commission providers must have
         a Paystack subaccount.

         Without this, we cannot safely
         perform the provider split.
      */

      if (
        !provider.paystackSubaccountCode
      ) {

        return res.status(400).json({
          message:
            "This service provider is not ready to receive commission-plan payments."
        });
      }

      console.log(
        "PAYMENT PLAN: COMMISSION"
      );

      console.log(
        "COMMISSION PERCENTAGE:",
        COMMISSION_PERCENTAGE
      );
    }


    /* =========================
       PAYSTACK AMOUNT
    ========================= */

    /*
       Paystack expects the amount
       in the smallest currency unit.

       Example:
       R500 = 50000
    */

    const paystackAmount =
      Math.round(
        amount * 100
      );


    if (
      paystackAmount <= 0
    ) {

      return res.status(400).json({
        message:
          "Invalid Paystack amount"
      });
    }


    /* =========================
       REFERENCE
    ========================= */

    const reference =
      `QC-${booking._id}-${Date.now()}`;


    /* =========================
       PAYSTACK PAYMENT DATA
    ========================= */

    const paymentData = {

      email,

      amount:
        paystackAmount,

      currency:
        "ZAR",

      reference,

      callback_url:
        "https://reviving-tarantula-briskly.ngrok-free.dev/payment-success.html",

      channels: [
        "card"
      ],

      metadata: JSON.stringify({

        bookingId:
          booking._id.toString(),

        customerName:
          booking.customerName ||
          booking.user.name ||
          "",

        service:
          booking.service?.name ||
          "",

        providerId:
          provider._id.toString(),

        providerPlan:
          providerPlan,

        commissionPercentage:
          providerPlan ===
          "commission"
            ? COMMISSION_PERCENTAGE
            : 0

      })

    };


    /* =========================
       COMMISSION SPLIT
    ========================= */

    if (
      providerPlan ===
      "commission"
    ) {

      /*
         Calculate QC's commission.

         Example internally:
         10% commission
         90% provider share.

         The provider/customer UI
         does not need to display
         the money split.
      */

      const commissionAmount =
        Math.round(
          paystackAmount *
          (
            COMMISSION_PERCENTAGE /
            100
          )
        );


      if (
        commissionAmount < 0 ||
        commissionAmount >
          paystackAmount
      ) {

        return res.status(500).json({
          message:
            "Invalid commission configuration."
        });
      }


      /*
         Paystack transaction_charge
         represents the amount retained
         by the main QuickConnect account
         when using a subaccount.

         The remaining amount goes
         to the provider subaccount.
      */

      paymentData.subaccount =
        provider.paystackSubaccountCode;

      paymentData.transaction_charge =
        commissionAmount;

      console.log(
        "PAYSTACK COMMISSION SPLIT ENABLED"
      );

      console.log(
        "SUBACCOUNT:",
        provider.paystackSubaccountCode
      );

      console.log(
        "COMMISSION PERCENTAGE:",
        COMMISSION_PERCENTAGE
      );

    }


    /* =========================
       INITIALIZE PAYSTACK
    ========================= */

    console.log(
      "INITIALIZING PAYSTACK PAYMENT:",
      {
        reference,
        providerPlan,
        amount: paystackAmount
      }
    );


    const response =
      await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",

          headers: {

            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,

            "Content-Type":
              "application/json"

          },

          body:
            JSON.stringify(
              paymentData
            )
        }
      );


    const data =
      await response.json();


    console.log(
      "PAYSTACK INITIALIZE RESPONSE:",
      data
    );


    if (
      !response.ok ||
      !data.status
    ) {

      console.error(
        "Paystack initialization error:",
        data
      );

      return res.status(400).json({
        message:
          data.message ||
          "Unable to initialize payment"
      });
    }


    /* =========================
       SAVE PAYMENT REFERENCE
    ========================= */

    booking.paystackReference =
      data.data.reference;

    booking.paymentStatus =
      "pending";

    await booking.save();


    /* =========================
       RESPONSE
    ========================= */

    res.status(200).json({

      message:
        "Payment initialized successfully",

      authorization_url:
        data.data.authorization_url,

      access_code:
        data.data.access_code,

      reference:
        data.data.reference,

      providerPlan:
        providerPlan

    });


  } catch (err) {

    console.error(
      "Initialize payment error:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};


/* =========================
   VERIFY PAYSTACK PAYMENT
========================= */

export const verifyPayment = async (
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
          "Payment reference is required"
      });
    }


    /* =========================
       FIND BOOKING
    ========================= */

    const booking =
      await Booking.findOne({
        paystackReference:
          reference
      });


    if (!booking) {

      return res.status(404).json({
        message:
          "Booking for this payment was not found"
      });
    }


    /* =========================
       CHECK BOOKING OWNER
    ========================= */

    if (
      booking.user.toString() !==
      req.user._id.toString()
    ) {

      return res.status(403).json({
        message:
          "Not authorized to verify this payment"
      });
    }


    /* =========================
       VERIFY WITH PAYSTACK
    ========================= */

    const response =
      await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: "GET",

          headers: {

            Authorization:
              `Bearer ${process.env.PAYSTACK_SECRET_KEY}`

          }
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.status
    ) {

      console.error(
        "Paystack verification error:",
        data
      );

      booking.paymentStatus =
        "failed";

      await booking.save();

      return res.status(400).json({
        message:
          data.message ||
          "Payment verification failed"
      });
    }


    /* =========================
       CHECK TRANSACTION
    ========================= */

    const transaction =
      data.data;


    if (
      !transaction ||
      transaction.status !==
        "success"
    ) {

      booking.paymentStatus =
        "failed";

      await booking.save();

      return res.status(400).json({
        message:
          "Payment was not successful"
      });
    }


    /* =========================
       CHECK AMOUNT
    ========================= */

    const expectedAmount =
      Math.round(
        Number(
          booking.price || 0
        ) * 100
      );


    if (
      Number(
        transaction.amount
      ) !==
      expectedAmount
    ) {

      console.error(
        "Payment amount mismatch",
        {
          expected:
            expectedAmount,

          received:
            transaction.amount,

          reference
        }
      );


      booking.paymentStatus =
        "failed";

      await booking.save();


      return res.status(400).json({
        message:
          "Payment amount does not match booking amount"
      });
    }


    /* =========================
       CHECK REFERENCE
    ========================= */

    if (
      transaction.reference !==
      booking.paystackReference
    ) {

      booking.paymentStatus =
        "failed";

      await booking.save();

      return res.status(400).json({
        message:
          "Payment reference does not match booking"
      });
    }


    /* =========================
       PAYMENT SUCCESS
    ========================= */

    booking.paymentStatus =
      "paid";

    booking.paidAt =
      new Date();

    booking.paystackReference =
      transaction.reference;


    await booking.save();


    /* =========================
       SUCCESS RESPONSE
    ========================= */

    res.status(200).json({

      message:
        "Payment verified successfully",

      paymentStatus:
        "paid",

      bookingId:
        booking._id,

      reference:
        transaction.reference

    });


  } catch (err) {

    console.error(
      "Verify payment error:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};