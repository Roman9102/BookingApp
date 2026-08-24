import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true
    },

    bookingDate: {
      type: Date,
      required: true
    },

    bookingTime: {
      type: String,
      default: ""
    },

    paymentMethod: {
      type: String,
      enum: ["cash", "eft", "card"],
      required: true
    },

    paymentStatus: {
      type: String,
      enum: [
        "unpaid",
        "pending",
        "paid",
        "failed",
        "refunded"
      ],
      default: "unpaid"
    },

    paystackReference: {
      type: String,
      default: ""
    },

    paidAt: {
      type: Date
    },

    price: {
      type: Number,
      default: 0
    },

    status: {
      type: String,
      enum: [
        "pending",
        "accepted",
        "postponed",
        "completed",
        "declined",
        "cancelled"
      ],
      default: "pending"
    },

    /* =========================
       CUSTOMER DETAILS
    ========================= */

    customerName: {
      type: String,
      trim: true,
      default: ""
    },

    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },

    customerPhone: {
      type: String,
      trim: true,
      default: ""
    },

    /* =========================
       BOOKING DETAILS
    ========================= */

    location: {
      type: String,
      default: ""
    },

    serviceLocation: {
      type: String,
      trim: true,
      default: ""
    },

    customerLocation: {
      type: String,
      trim: true,
      default: ""
    },

    notes: {
      type: String,
      default: ""
    },

    /* =========================
       CUSTOMER DELETE / HIDE
    ========================= */

    customerDeleted: {
      type: Boolean,
      default: false
    },

    /* =========================
       ACCEPT
    ========================= */

    acceptedAt: {
      type: Date
    },

    /* =========================
       COMPLETE
    ========================= */

    completedAt: {
      type: Date
    },

    /* =========================
       DECLINE
    ========================= */

    declinedAt: {
      type: Date
    },

    declineReason: {
      type: String,
      default: ""
    },

    /* =========================
       POSTPONE
    ========================= */

    postponedAt: {
      type: Date
    },

    postponedDate: {
      type: Date
    },

    postponedTime: {
      type: String,
      default: ""
    },

    postponedReason: {
      type: String,
      default: ""
    },

    /* =========================
       POSTPONEMENT RESPONSE

       pending:
       Waiting for customer.

       approved:
       Customer accepted the
       provider's new date/time.

       rebook:
       Customer wants another
       booking/date.
    ========================= */

    postponedResponse: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rebook"
      ],
      default: "pending"
    },

    /* =========================
       REBOOK REQUEST

       false:
       No rebooking requested.

       true:
       Customer wants another
       booking/date.
    ========================= */

    rebookRequested: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Booking ||
  mongoose.model(
    "Booking",
    bookingSchema
  );