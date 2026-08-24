import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      default: "user",
      enum: ["user", "serviceProvider", "admin"]
    },

    /* =========================
       PERSONAL INFORMATION
    ========================= */

    phone: {
      type: String,
      default: "",
      trim: true
    },

    /* =========================
       BUSINESS INFORMATION
    ========================= */

    businessName: {
      type: String,
      default: "",
      trim: true
    },

    businessDescription: {
      type: String,
      default: "",
      trim: true
    },

    businessPhone: {
      type: String,
      default: "",
      trim: true
    },

    businessAddress: {
      type: String,
      default: "",
      trim: true
    },

    /* =========================
       PROVIDER PAYMENT PLAN
    ========================= */

    providerPlan: {
      type: String,
      enum: ["subscription", "commission"],
      default: undefined
    },

    /* =========================
       SUBSCRIPTION
    ========================= */

    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: undefined
    },

    subscriptionExpiresAt: {
      type: Date,
      default: null
    },

    /* =========================
       PAYSTACK PROVIDER ACCOUNT
    ========================= */

    paystackSubaccountCode: {
      type: String,
      default: ""
    },

    /* =========================
       PAYMENT TERMS
    ========================= */

    paymentTermsAccepted: {
      type: Boolean,
      default: false
    },

    paymentTermsAcceptedAt: {
      type: Date,
      default: null
    },

    /* =========================
       PASSWORD RESET OTP
    ========================= */

    resetOTP: {
      type: String,
      default: null
    },

    resetOTPExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.User ||
  mongoose.model("User", userSchema);