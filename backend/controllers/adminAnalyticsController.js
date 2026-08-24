import Booking from "../models/booking.js";
import Service from "../models/service.js";
import User from "../models/user.js";

/* ========================
   PROVIDER ANALYTICS
======================== */
export const getAnalytics = async (req, res) => {
  try {

    /* ========================
       CHECK AUTHENTICATION
    ======================== */

    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized"
      });
    }

    /* ========================
       SERVICE PROVIDER ONLY
    ======================== */

    if (req.user.role !== "serviceProvider") {
      return res.status(403).json({
        message:
          "Only service providers can view business analytics."
      });
    }

    /* ========================
       GET ONLY THIS PROVIDER'S
       SERVICES
    ======================== */

    const providerServices =
      await Service.find({
        provider: req.user._id
      }).select("_id name");

    const serviceIds =
      providerServices.map(
        service => service._id
      );

    /* ========================
       GET ONLY BOOKINGS FOR
       THIS PROVIDER'S SERVICES
    ======================== */

    const bookings =
      await Booking.find({
        service: {
          $in: serviceIds
        }
      })
        .populate(
          "service",
          "name"
        )
        .populate(
          "user",
          "name"
        );

    /* ========================
       PROVIDER COUNTS
    ======================== */

    const totalServices =
      providerServices.length;

    const totalUsers =
      new Set(
        bookings
          .filter(b => b.user)
          .map(b =>
            b.user._id.toString()
          )
      ).size;

    let revenue = 0;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let declined = 0;
    let postponed = 0;

    let cash = 0;
    let eft = 0;
    let card = 0;

    /* ========================
       AVERAGE BOOKING
    ======================== */

    const averageBooking =
      bookings.length > 0
        ? bookings.reduce(
            (sum, b) =>
              sum +
              Number(b.price || 0),
            0
          ) / bookings.length
        : 0;

    /* ========================
       WEEK DAYS
    ======================== */

    const weekNames = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat"
    ];

    const weeklyRevenue =
      weekNames.map(day => ({
        day,
        revenue: 0
      }));

    const weeklyBookings =
      weekNames.map(day => ({
        day,
        bookings: 0
      }));

    /* ========================
       MONTHLY REVENUE
    ======================== */

    const monthlyRevenue = [
      { month: "Jan", revenue: 0 },
      { month: "Feb", revenue: 0 },
      { month: "Mar", revenue: 0 },
      { month: "Apr", revenue: 0 },
      { month: "May", revenue: 0 },
      { month: "Jun", revenue: 0 },
      { month: "Jul", revenue: 0 },
      { month: "Aug", revenue: 0 },
      { month: "Sep", revenue: 0 },
      { month: "Oct", revenue: 0 },
      { month: "Nov", revenue: 0 },
      { month: "Dec", revenue: 0 }
    ];

    /* ========================
       SERVICE BOOKING TOTALS
    ======================== */

    const serviceTotals = {};

    /* ========================
       PROCESS BOOKINGS
    ======================== */

    bookings.forEach(b => {

      const amount =
        Number(b.price || 0);

      const status =
        (b.status || "")
          .toLowerCase();

      const paymentMethod =
        (b.paymentMethod || "")
          .toLowerCase();

      const created =
        new Date(b.createdAt);

      /* ========================
         WEEKLY DATA
      ======================== */

      if (!isNaN(created.getTime())) {

        weeklyBookings[
          created.getDay()
        ].bookings++;

        if (
          status === "completed"
        ) {

          weeklyRevenue[
            created.getDay()
          ].revenue += amount;

          monthlyRevenue[
            created.getMonth()
          ].revenue += amount;

        }
      }

      /* ========================
         BOOKING STATUS
      ======================== */

      switch (status) {

        case "completed":

          completed++;

          revenue += amount;

          break;

        case "pending":

          pending++;

          break;

        case "cancelled":

          cancelled++;

          break;

        case "declined":

          declined++;

          break;

        case "postponed":

          postponed++;

          break;

      }

      /* ========================
         PAYMENT METHODS
      ======================== */

      switch (paymentMethod) {

        case "cash":

          cash++;

          break;

        case "eft":

          eft++;

          break;

        case "card":

          card++;

          break;

      }

      /* ========================
         SERVICE TOTALS
      ======================== */

      if (b.service?.name) {

        if (
          !serviceTotals[
            b.service.name
          ]
        ) {
          serviceTotals[
            b.service.name
          ] = 0;
        }

        serviceTotals[
          b.service.name
        ]++;

      }

    });

    /* ========================
       TOP SERVICES
    ======================== */

    const topServices =
      Object.entries(
        serviceTotals
      )
        .sort(
          (a, b) =>
            b[1] - a[1]
        )
        .slice(0, 5)
        .map(
          ([service, bookings]) => ({
            name: service,
            bookings
          })
        );

    /* ========================
       RECENT BOOKINGS
    ======================== */

    const recentBookings =
      [...bookings]
        .sort(
          (a, b) =>
            new Date(b.createdAt) -
            new Date(a.createdAt)
        )
        .slice(0, 5)
        .map(b => ({

          customer:
            b.user?.name ||
            "Unknown",

          service:
            b.service?.name ||
            "Unknown",

          amount:
            Number(
              b.price || 0
            ),

          status:
            b.status,

          paymentMethod:
            b.paymentMethod,

          date:
            b.createdAt

        }));

    /* ========================
       RESPONSE
    ======================== */

    res.json({

      revenue,

      totalRevenue:
        revenue,

      totalBookings:
        bookings.length,

      completed,

      completedBookings:
        completed,

      pending,

      pendingBookings:
        pending,

      cancelled,

      cancelledBookings:
        cancelled,

      declined,

      declinedBookings:
        declined,

      postponed,

      postponedBookings:
        postponed,

      services:
        totalServices,

      totalServices,

      users:
        totalUsers,

      totalUsers,

      averageBooking:
        Number(
          averageBooking.toFixed(2)
        ),

      paymentMethods: {
        cash,
        eft,
        card
      },

      weeklyRevenue,

      weeklyBookings,

      monthlyRevenue,

      topServices,

      recentBookings

    });

  } catch (err) {

    console.error(
      "PROVIDER ANALYTICS ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });

  }
};