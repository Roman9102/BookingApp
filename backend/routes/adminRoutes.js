import express from "express";

import { getAnalytics } from "../controllers/adminAnalyticsController.js";

import {
  getAllBookings,
  updateBookingStatus,
  deleteBooking
} from "../controllers/adminBookingController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ========================
   ADMIN ROUTES
======================== */
router.get("/analytics", protect, adminOnly, getAnalytics);

router.get("/bookings", protect, adminOnly, getAllBookings);

router.put("/bookings/:id", protect, adminOnly, updateBookingStatus);

router.delete("/bookings/:id", protect, adminOnly, deleteBooking);

export default router;