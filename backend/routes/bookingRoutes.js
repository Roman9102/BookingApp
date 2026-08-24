import express from "express";

import {
  createBooking,
  getMyBookings,
  getAllBookings,
  acceptBooking,
  postponeBooking,
  declineBooking,
  completeBooking,
  getBookingDetails,
  deleteBooking,
  getBookingHistory,
  respondToPostponedBooking
} from "../controllers/bookingController.js";

import {
  protect,
  adminOnly
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* ========================
   TEST
======================== */
router.get("/", (req, res) => {
  res.json({
    message: "Bookings working"
  });
});

/* ========================
   USER ROUTES
======================== */

router.post(
  "/",
  protect,
  createBooking
);

router.get(
  "/my",
  protect,
  getMyBookings
);

/* ========================
   USER BOOKING HISTORY

   Each customer only sees
   their own completed,
   declined and cancelled
   bookings.

   Customer soft-deleted
   bookings remain available
   to the provider.
======================== */

router.get(
  "/history",
  protect,
  getBookingHistory
);

/* ========================
   CUSTOMER POSTPONED
   BOOKING RESPONSE

   approved:
   Booking returns to active
   bookings.

   rebook:
   Original booking is closed
   and moves to history.
======================== */

router.put(
  "/:id/postponed-response",
  protect,
  respondToPostponedBooking
);

/* ========================
   DELETE / HIDE BOOKING

   Soft delete only.
   Database record remains
   available for provider
   history and analytics.
======================== */

router.delete(
  "/:id",
  protect,
  deleteBooking
);

/* ========================
   ADMIN / PROVIDER ROUTES
======================== */

/* ========================
   ACTIVE BOOKINGS
======================== */

router.get(
  "/admin/all",
  protect,
  adminOnly,
  getAllBookings
);

/* ========================
   PROVIDER / ADMIN HISTORY

   Each service provider
   only sees history for
   bookings belonging to
   their own services.

   Admin sees all history.

   This does NOT delete or
   remove actioned bookings.
======================== */

router.get(
  "/admin/history",
  protect,
  adminOnly,
  getBookingHistory
);

/* ========================
   BOOKING DETAILS
======================== */

router.get(
  "/admin/:id",
  protect,
  adminOnly,
  getBookingDetails
);

/* ========================
   ACCEPT BOOKING
======================== */

router.put(
  "/admin/:id/accept",
  protect,
  adminOnly,
  acceptBooking
);

/* ========================
   POSTPONE BOOKING

   Provider proposes a new
   date/time.

   Booking stays active
   until customer responds.
======================== */

router.put(
  "/admin/:id/postpone",
  protect,
  adminOnly,
  postponeBooking
);

/* ========================
   DECLINE BOOKING

   Booking moves to history.
======================== */

router.put(
  "/admin/:id/decline",
  protect,
  adminOnly,
  declineBooking
);

/* ========================
   COMPLETE BOOKING

   Booking moves to history.
======================== */

router.put(
  "/admin/:id/complete",
  protect,
  adminOnly,
  completeBooking
);

export default router;