import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    price: {
      type: Number,
      default: 0
    },

    serviceMode: {
      type: [String],
      enum: ["store", "mobile"],
      required: true,
      default: []
    },

    storeLocation: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      default: "Uncategorized",
      trim: true
    },

    /* =========================
       SERVICE PROVIDER
    ========================= */

    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    providerName: {
      type: String,
      default: "Unknown Provider",
      trim: true
    },

    /* MAIN IMAGE (Backward Compatibility) */

    image: {
      type: String,
      default: ""
    },

    /* FULL IMAGE GALLERY */

    images: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "Maximum of 5 images allowed."
      }
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    location: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

/* =========================
   ALWAYS KEEP IMAGE
   SYNCED WITH GALLERY
========================= */

serviceSchema.pre("save", function (next) {
  if (
    (!this.image || this.image === "") &&
    this.images.length > 0
  ) {
    this.image = this.images[0];
  }

  if (
    this.images.length === 0 &&
    this.image
  ) {
    this.images = [this.image];
  }

  next();
});

export default mongoose.models.Service ||
  mongoose.model("Service", serviceSchema);