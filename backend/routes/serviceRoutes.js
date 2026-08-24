/* =========================
   serviceRoutes.js
   FIXED SERVICE ROUTES
========================= */

import express from "express";

import {
  createService,
  getServices,
  getMyServices,
  deleteService,
  addServiceImages,
  deleteServiceImage,
  replaceServiceImages
} from "../controllers/serviceController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   PUBLIC SERVICES
========================= */

// Customers / normal users
// See services from all providers

router.get(
  "/",
  getServices
);

/* =========================
   PROVIDER SERVICES
========================= */

// Provider dashboard
// ONLY the logged-in provider's services

router.get(
  "/my",
  protect,
  getMyServices
);

/* =========================
   CREATE SERVICE
========================= */

// Service providers only

router.post(
  "/",
  protect,
  createService
);

/* =========================
   DELETE SERVICE
========================= */

// Only the service owner can delete

router.delete(
  "/:id",
  protect,
  deleteService
);

/* =========================
   IMAGE MANAGEMENT
========================= */

// Add images
// Maximum 5 total images

router.post(
  "/:id/images",
  protect,
  addServiceImages
);

// Delete one image

router.delete(
  "/:id/images",
  protect,
  deleteServiceImage
);

// Replace all images

router.put(
  "/:id/images",
  protect,
  replaceServiceImages
);

export default router;