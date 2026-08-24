import Booking from "../models/booking.js";
import { io } from "../server.js";

/* ========================
   GET ALL BOOKINGS
======================== */
export const getAllBookings = async (req, res) => {
  try {

    const userRole = req.user?.role;

    let bookings = [];

    if (userRole === "admin") {

      bookings = await Booking.find()
        .populate(
          "user",
          "name email phone cellphone mobileNumber phoneNumber"
        )
        .populate(
          "service",
          "name price category storeLocation"
        )
        .sort({ createdAt: -1 });

    } else if (userRole === "serviceProvider") {

      bookings = await Booking.find()
        .populate(
          "user",
          "name email phone cellphone mobileNumber phoneNumber"
        )
        .populate(
          "service",
          "name price category storeLocation"
        )
        .sort({ createdAt: -1 });

    } else {

      return res.status(403).json({
        message: "Not authorized"
      });

    }

    const formattedBookings = bookings.map(b => ({

      _id: b._id,

      customer: {
        id: b.user?._id,
        name: b.user?.name || "Unknown",
        email: b.user?.email || "No Email",

        // Uses the booking phone first if it exists,
        // otherwise falls back to the user's saved phone.
        phone:
          b.customerPhone ||
          b.user?.phone ||
          b.user?.cellphone ||
          b.user?.mobileNumber ||
          b.user?.phoneNumber ||
          "Not provided"
      },

      service: {
        id: b.service?._id,
        name: b.service?.name || "Unknown Service",
        category: b.service?.category || "General",
        location: b.service?.storeLocation || ""
      },

      bookingDate: b.bookingDate,
      createdAt: b.createdAt,
      paymentMethod: b.paymentMethod,
      price: b.price || 0,
      status: b.status,

      // Added so the frontend can access it directly
      customerPhone: b.customerPhone || ""

    }));

    res.json(formattedBookings);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: err.message
    });

  }
};

/* ========================
   UPDATE BOOKING STATUS
======================== */
export const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    )
      .populate("user", "name email")
      .populate("service", "name price");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    io.emit("bookingUpdate", booking);

    res.json(booking);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ========================
   DELETE BOOKING
======================== */
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    await Booking.findByIdAndDelete(req.params.id);

    io.emit("bookingDeleted", booking._id);

    res.json({ message: "Booking deleted successfully" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};