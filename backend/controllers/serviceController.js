/* =========================
   serviceController.js
   FIXED:
   - Provider services stay separated
   - /api/services = public marketplace
   - /api/services/my = logged-in provider only
   - Images and thumbnails remain supported
========================= */

import Service from "../models/service.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   MULTER CONFIG
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, "uploads/"),

  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        path.extname(file.originalname)
    )
});

const upload = multer({
  storage,
  limits: {
    files: 5
  }
}).array("images", 5);

/* =========================
   CREATE SERVICE
========================= */

export const createService = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: err.message
      });
    }

    try {
      const {
        name,
        description,
        price,
        storeLocation,
        storeMode,
        mobileMode,
        category,
        providerName,
        rating,
        location
      } = req.body;

      if (!req.user) {
        return res.status(401).json({
          message: "Not authorized"
        });
      }

      if (req.user.role !== "serviceProvider") {
        return res.status(403).json({
          message:
            "Only service providers can create services."
        });
      }

      /* =========================
         SERVICE MODE
      ========================= */

      const serviceMode = [];

      if (
        storeMode === "true" ||
        storeMode === true
      ) {
        serviceMode.push("store");
      }

      if (
        mobileMode === "true" ||
        mobileMode === true
      ) {
        serviceMode.push("mobile");
      }

      /* =========================
         IMAGES
      ========================= */

      const images = req.files
        ? req.files.map(
            (file) =>
              `/uploads/${file.filename}`
          )
        : [];

      /* =========================
         CREATE SERVICE
      ========================= */

      const service =
        await Service.create({
          name,
          description,

          price:
            Number(price || 0),

          serviceMode,

          storeLocation,

          category:
            category ||
            "Uncategorized",

          /*
            IMPORTANT:
            Every service is permanently
            linked to the provider who
            created it.
          */

          provider:
            req.user._id,

          /*
            Keep image for old UI
            compatibility.
          */

          image:
            images[0] || "",

          /*
            Keep ALL images so the
            provider/customer thumbnails
            and gallery can use them.
          */

          images,

          providerName:
            providerName ||
            req.user.name ||
            "Unknown Provider",

          rating:
            Number(rating || 0),

          location:
            location || ""
        });

      res.status(201).json(service);

    } catch (err) {
      console.error(
        "CREATE SERVICE ERROR:",
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  });
};

/* =========================
   GET ALL SERVICES
   PUBLIC MARKETPLACE
========================= */

export const getServices = async (
  req,
  res
) => {
  try {

    /*
      IMPORTANT:

      This route remains the public
      marketplace.

      Customers/users can see services
      from ALL providers.

      Provider dashboard must NOT use
      this endpoint. It must use
      getMyServices (/api/services/my).
    */

    const services =
      await Service.find({})
        .sort({
          createdAt: -1
        });

    res.json(services);

  } catch (err) {
    console.error(
      "GET SERVICES ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

/* =========================
   GET MY SERVICES
   PROVIDER DASHBOARD
========================= */

export const getMyServices = async (
  req,
  res
) => {
  try {

    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized"
      });
    }

    if (req.user.role !== "serviceProvider") {
      return res.status(403).json({
        message:
          "Only service providers can access their dashboard services."
      });
    }

    /*
      CRITICAL FIX:

      Only services whose provider field
      matches the logged-in provider's
      _id are returned.

      This means Provider A cannot see
      Provider B's services.
    */

    const services =
      await Service.find({
        provider: req.user._id
      })
        .sort({
          createdAt: -1
        });

    res.json(services);

  } catch (err) {
    console.error(
      "GET MY SERVICES ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

/* =========================
   DELETE SERVICE
========================= */

export const deleteService = async (
  req,
  res
) => {
  try {

    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized"
      });
    }

    const service =
      await Service.findById(
        req.params.id
      );

    if (!service) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    /* =========================
       ONLY OWNER CAN DELETE
    ========================= */

    if (
      !service.provider ||
      service.provider.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to delete this service."
      });
    }

    await Service.findByIdAndDelete(
      req.params.id
    );

    res.json({
      message:
        "Service deleted successfully"
    });

  } catch (err) {
    console.error(
      "DELETE SERVICE ERROR:",
      err
    );

    res.status(500).json({
      message: err.message
    });
  }
};

/* =========================
   ADD IMAGES
   APPEND + MAX 5
========================= */

export const addServiceImages = (
  req,
  res
) => {
  upload(req, res, async (err) => {

    if (err) {
      return res.status(400).json({
        message: err.message
      });
    }

    try {

      if (!req.user) {
        return res.status(401).json({
          message: "Not authorized"
        });
      }

      const service =
        await Service.findById(
          req.params.id
        );

      if (!service) {
        return res.status(404).json({
          message: "Service not found"
        });
      }

      /* =========================
         ONLY OWNER
      ========================= */

      if (
        !service.provider ||
        service.provider.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to modify this service."
        });
      }

      const newImages =
        (req.files || []).map(
          (file) =>
            `/uploads/${file.filename}`
        );

      if (!Array.isArray(service.images)) {
        service.images = [];
      }

      /* =========================
         MAX 5 TOTAL
      ========================= */

      const combined = [
        ...service.images,
        ...newImages
      ].slice(0, 5);

      service.images = combined;

      /*
        Keep first image for the
        existing service-card preview.
      */

      service.image =
        combined[0] || "";

      await service.save();

      res.json(service);

    } catch (err) {

      console.error(
        "ADD SERVICE IMAGES ERROR:",
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  });
};

/* =========================
   DELETE SINGLE IMAGE
========================= */

export const deleteServiceImage =
  async (req, res) => {

    try {

      if (!req.user) {
        return res.status(401).json({
          message: "Not authorized"
        });
      }

      const service =
        await Service.findById(
          req.params.id
        );

      if (!service) {
        return res.status(404).json({
          message: "Service not found"
        });
      }

      /* =========================
         ONLY OWNER
      ========================= */

      if (
        !service.provider ||
        service.provider.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You are not authorized to modify this service."
        });
      }

      if (!Array.isArray(service.images)) {
        service.images = [];
      }

      let { image } = req.body;

      if (!image) {
        return res.status(400).json({
          message: "Image is required."
        });
      }

      try {
        image =
          decodeURIComponent(image);
      } catch {
        // Keep original image
      }

      service.images =
        service.images.filter(
          (img) => img !== image
        );

      /*
        IMPORTANT:

        Update the small main preview
        after deleting an image.
      */

      service.image =
        service.images[0] || "";

      await service.save();

      res.json({
        message:
          "Image deleted successfully",

        service
      });

    } catch (err) {

      console.error(
        "DELETE SERVICE IMAGE ERROR:",
        err
      );

      res.status(500).json({
        message: err.message
      });
    }
  };

/* =========================
   REPLACE ALL IMAGES
========================= */

export const replaceServiceImages = (
  req,
  res
) => {

  upload(
    req,
    res,
    async (err) => {

      if (err) {
        return res.status(400).json({
          message: err.message
        });
      }

      try {

        if (!req.user) {
          return res.status(401).json({
            message:
              "Not authorized"
          });
        }

        const service =
          await Service.findById(
            req.params.id
          );

        if (!service) {
          return res.status(404).json({
            message:
              "Service not found"
          });
        }

        /* =========================
           ONLY OWNER
        ========================= */

        if (
          !service.provider ||
          service.provider.toString() !==
            req.user._id.toString()
        ) {
          return res.status(403).json({
            message:
              "You are not authorized to modify this service."
          });
        }

        const images =
          (req.files || [])
            .map(
              (file) =>
                `/uploads/${file.filename}`
            )
            .slice(0, 5);

        service.images = images;

        /*
          Keep the main service-card
          preview working.
        */

        service.image =
          images[0] || "";

        await service.save();

        res.json(service);

      } catch (err) {

        console.error(
          "REPLACE SERVICE IMAGES ERROR:",
          err
        );

        res.status(500).json({
          message: err.message
        });
      }
    }
  );
};