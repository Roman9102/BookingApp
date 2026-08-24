import Booking from "../models/booking.js";
import Service from "../models/service.js";
import User from "../models/user.js";

/* =========================
CREATE BOOKING
========================= */
export const createBooking = async (req, res) => {
  try {
    console.log(
      "========== CREATE BOOKING =========="
    );
    console.log("BODY:", req.body);
    console.log(
      "===================================="
    );

    const {
      service,
      bookingDate,
      bookingTime,
      location,
      serviceLocation,
      paymentMethod,
      notes,
      customerPhone
    } = req.body;

    const serviceData =
      await Service.findById(service);

    if (!serviceData) {
      return res.status(404).json({
        message: "Service not found"
      });
    }

    const user =
      await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    /* =========================
       FIND SERVICE PROVIDER
    ========================= */

    if (!serviceData.provider) {
      return res.status(400).json({
        message:
          "This service does not have a registered service provider."
      });
    }

    const provider =
      await User.findById(
        serviceData.provider
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
          "The service provider account is invalid."
      });
    }

    /* =========================
       NORMALIZE PAYMENT METHOD
    ========================= */

    const selectedPaymentMethod =
      String(paymentMethod || "")
        .toLowerCase()
        .trim();

    /* =========================
       PAYMENT PLAN ENFORCEMENT

       COMMISSION:
       Card only.

       SUBSCRIPTION:
       Card always allowed.
       Cash only when subscription
       is active.
    ========================= */

    if (
      provider.providerPlan ===
      "commission"
    ) {
      if (
        selectedPaymentMethod !==
        "card"
      ) {
        return res.status(400).json({
          message:
            "This service provider uses the commission plan. Customers can only pay by card."
        });
      }
    } else if (
      provider.providerPlan ===
      "subscription"
    ) {
      const subscriptionActive =
        provider.subscriptionStatus ===
        "active";

      if (
        selectedPaymentMethod !==
          "card" &&
        selectedPaymentMethod !==
          "cash"
      ) {
        return res.status(400).json({
          message:
            "Please select a valid payment method."
        });
      }

      if (
        selectedPaymentMethod ===
          "cash" &&
        !subscriptionActive
      ) {
        return res.status(400).json({
          message:
            "Cash payments are only available when the service provider has an active subscription. Please use card payment."
        });
      }
    } else {
      return res.status(400).json({
        message:
          "The service provider does not have a valid payment plan."
      });
    }

    /* =========================
       CREATE BOOKING
    ========================= */

    const booking =
      await Booking.create({
        user:
          req.user._id,

        service,

        bookingDate:
          new Date(bookingDate),

        bookingTime,

        paymentMethod:
          selectedPaymentMethod,

        location,

        serviceLocation,

        customerLocation:
          serviceLocation,

        notes,

        price:
          serviceData.price,

        customerName:
          user?.name || "",

        customerEmail:
          user?.email || "",

        customerPhone:
          customerPhone ||
          user?.phone ||
          "",

        customerDeleted:
          false,

        status:
          "pending",

        postponedResponse:
          "pending",

        rebookRequested:
          false
      });

    const populatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate("service")
        .populate(
          "user",
          "name email phone"
        );

    res.status(201).json({
      message:
        "Booking created successfully",

      booking:
        populatedBooking
    });

  } catch (err) {
    console.error(
      "CREATE BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
GET MY BOOKINGS

CUSTOMER ONLY SEES ACTIVE
BOOKINGS THEY HAVE NOT
DELETED.

ACTIVE:
pending
accepted
postponed
========================= */
export const getMyBookings = async (
  req,
  res
) => {
  try {
    const bookings =
      await Booking.find({
        user:
          req.user._id,

        customerDeleted: {
          $ne: true
        },

        status: {
          $in: [
            "pending",
            "accepted",
            "postponed"
          ]
        }
      })
        .populate("service")
        .sort({
          createdAt: -1
        });

    res.json(
      bookings
    );

  } catch (err) {
    console.error(
      "GET MY BOOKINGS ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
GET BOOKING HISTORY

CUSTOMER:
Only their own actioned
bookings.

SERVICE PROVIDER:
Only actioned bookings
belonging to their own
services.

ADMIN:
All actioned bookings.

HISTORY:
completed
declined
cancelled

POSTPONED BOOKINGS ONLY
ENTER HISTORY AFTER THEY
HAVE BEEN ACTIONED.

Pending postponed bookings
remain in recent bookings
because the customer still
needs to respond.
========================= */
export const getBookingHistory = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    /* =========================
       HISTORY STATUSES
    ========================= */

    const historyStatuses = [
      "completed",
      "declined",
      "cancelled"
    ];

    /* =========================
       SERVICE PROVIDER HISTORY

       ONLY BOOKINGS BELONGING
       TO THEIR OWN SERVICES.
    ========================= */

    if (
      req.user.role ===
      "serviceProvider"
    ) {
      const myServices =
        await Service.find({
          provider:
            req.user._id
        })
          .select("_id");

      const serviceIds =
        myServices.map(
          service =>
            service._id
        );

      const bookings =
        await Booking.find({
          service: {
            $in:
              serviceIds
          },

          status: {
            $in:
              historyStatuses
          }
        })
          .populate("service")
          .populate(
            "user",
            "name email phone"
          )
          .sort({
            updatedAt: -1
          });

      return res.json(
        bookings
      );
    }

    /* =========================
       ADMIN HISTORY

       ADMIN CAN SEE ALL
       ACTIONED BOOKINGS.
    ========================= */

    if (
      req.user.role ===
      "admin"
    ) {
      const bookings =
        await Booking.find({
          status: {
            $in:
              historyStatuses
          }
        })
          .populate("service")
          .populate(
            "user",
            "name email phone"
          )
          .sort({
            updatedAt: -1
          });

      return res.json(
        bookings
      );
    }

    /* =========================
       CUSTOMER HISTORY

       ONLY BOOKINGS CREATED
       BY THIS CUSTOMER.

       CUSTOMER SOFT-DELETING
       A BOOKING HIDES IT FROM
       THEIR HISTORY BUT DOES
       NOT DELETE IT FROM THE
       DATABASE OR PROVIDER
       HISTORY.
    ========================= */

    const bookings =
      await Booking.find({
        user:
          req.user._id,

        customerDeleted: {
          $ne: true
        },

        status: {
          $in:
            historyStatuses
        }
      })
        .populate("service")
        .sort({
          updatedAt: -1
        });

    return res.json(
      bookings
    );

  } catch (err) {
    console.error(
      "GET BOOKING HISTORY ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
GET PROVIDER BOOKINGS

ONLY BOOKINGS FOR THE
PROVIDER'S OWN SERVICES.

HISTORY BOOKINGS ARE NOT
RETURNED HERE.

CUSTOMER DELETING A BOOKING
DOES NOT REMOVE IT FROM THE
PROVIDER'S ACCOUNT.
========================= */
export const getAllBookings = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message:
          "Not authorized"
      });
    }

    /* =========================
       PROVIDER DASHBOARD
    ========================= */

    if (
      req.user.role ===
      "serviceProvider"
    ) {
      const myServices =
        await Service.find({
          provider:
            req.user._id
        })
          .select("_id");

      const serviceIds =
        myServices.map(
          service =>
            service._id
        );

      const bookings =
        await Booking.find({
          service: {
            $in:
              serviceIds
          },

          status: {
            $in: [
              "pending",
              "accepted",
              "postponed"
            ]
          }
        })
          .populate("service")
          .populate(
            "user",
            "name email phone"
          )
          .sort({
            createdAt: -1
          });

      return res.json(
        bookings
      );
    }

    /* =========================
       ADMIN DASHBOARD

       ADMIN CAN SEE ALL ACTIVE
       BOOKINGS.
    ========================= */

    if (
      req.user.role ===
      "admin"
    ) {
      const bookings =
        await Booking.find({
          status: {
            $in: [
              "pending",
              "accepted",
              "postponed"
            ]
          }
        })
          .populate("service")
          .populate(
            "user",
            "name email phone"
          )
          .sort({
            createdAt: -1
          });

      return res.json(
        bookings
      );
    }

    /* =========================
       OTHER ROLES
    ========================= */

    const bookings =
      await Booking.find({
        status: {
          $in: [
            "pending",
            "accepted",
            "postponed"
          ]
        }
      })
        .populate("service")
        .populate(
          "user",
          "name email phone"
        )
        .sort({
          createdAt: -1
        });

    res.json(
      bookings
    );

  } catch (err) {
    console.error(
      "GET BOOKINGS ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
ACCEPT BOOKING

ONLY OWNER OF SERVICE
========================= */
export const acceptBooking = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("service");

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    if (
      req.user.role ===
        "serviceProvider" &&
      (
        !booking.service ||
        !booking.service.provider ||
        booking.service.provider.toString() !==
          req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to manage this booking."
      });
    }

    /* =========================
       ONLY ACTIVE BOOKINGS
       CAN BE ACCEPTED
    ========================= */

    if (
      ![
        "pending",
        "accepted"
      ].includes(
        booking.status
      )
    ) {
      return res.status(400).json({
        message:
          "This booking is no longer available to be accepted."
      });
    }

    /*
     * A postponed booking that is
     * waiting for the customer's
     * response must NOT be accepted
     * directly by the provider.
     */

    if (
      booking.status ===
        "postponed" &&
      booking.postponedResponse ===
        "pending"
    ) {
      return res.status(400).json({
        message:
          "This booking is waiting for the customer's response to the proposed new date and time."
      });
    }

    booking.status =
      "accepted";

    booking.acceptedAt =
      new Date();

    /*
     * If this booking was previously
     * postponed, accepting it means
     * the customer/provider has now
     * agreed to the proposed date.
     */
    if (
      booking.postponedResponse ===
      "approved"
    ) {
      booking.rebookRequested =
        false;
    }

    await booking.save();

    res.json({
      message:
        "Booking accepted",

      booking
    });

  } catch (err) {
    console.error(
      "ACCEPT BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
POSTPONE BOOKING

PROVIDER PROPOSES A NEW
DATE AND TIME.

IT DOES NOT ENTER HISTORY
YET.

CUSTOMER MUST RESPOND:
approved
OR
rebook
========================= */
export const postponeBooking = async (
  req,
  res
) => {
  try {
    const {
      bookingDate,
      bookingTime,
      reason
    } = req.body;

    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("service");

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    if (
      req.user.role ===
        "serviceProvider" &&
      (
        !booking.service ||
        !booking.service.provider ||
        booking.service.provider.toString() !==
          req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to manage this booking."
      });
    }

    if (!bookingDate) {
      return res.status(400).json({
        message:
          "A new booking date is required."
      });
    }

    if (!bookingTime) {
      return res.status(400).json({
        message:
          "A new booking time is required."
      });
    }

    /* =========================
       ONLY ACTIVE BOOKINGS
       CAN BE POSTPONED
    ========================= */

    if (
      ![
        "pending",
        "accepted",
        "postponed"
      ].includes(
        booking.status
      )
    ) {
      return res.status(400).json({
        message:
          "Only active bookings can be postponed."
      });
    }

    booking.status =
      "postponed";

    booking.postponedAt =
      new Date();

    booking.postponedDate =
      new Date(bookingDate);

    booking.postponedTime =
      bookingTime;

    booking.postponedReason =
      reason || "";

    /* =========================
       WAIT FOR CUSTOMER
    ========================= */

    booking.postponedResponse =
      "pending";

    booking.rebookRequested =
      false;

    await booking.save();

    const updatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate("service")
        .populate(
          "user",
          "name email phone"
        );

    res.json({
      message:
        "Booking postponed. Waiting for customer response.",

      booking:
        updatedBooking
    });

  } catch (err) {
    console.error(
      "POSTPONE BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
CUSTOMER RESPONDS TO
POSTPONED BOOKING

approved:
Customer accepts the new
proposed date/time.

Booking becomes accepted
and waits for completion.

rebook:
Customer does not accept
the proposed date and wants
another booking.

The original booking is
closed and retained for
history/analytics.
========================= */
export const respondToPostponedBooking =
async (
  req,
  res
) => {
  try {
    const {
      response
    } = req.body;

    const normalizedResponse =
      String(
        response || ""
      )
        .toLowerCase()
        .trim();

    if (
      ![
        "approved",
        "rebook"
      ].includes(
        normalizedResponse
      )
    ) {
      return res.status(400).json({
        message:
          "Response must be either approved or rebook."
      });
    }

    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("service");

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    /* =========================
       CUSTOMER OWNERSHIP
    ========================= */

    if (
      booking.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to respond to this booking."
      });
    }

    /* =========================
       CUSTOMER DELETED
    ========================= */

    if (
      booking.customerDeleted ===
      true
    ) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    if (
      booking.status !==
      "postponed"
    ) {
      return res.status(400).json({
        message:
          "This booking is not waiting for a postponement response."
      });
    }

    if (
      booking.postponedResponse !==
      "pending"
    ) {
      return res.status(400).json({
        message:
          "This postponement has already been actioned."
      });
    }

    /* =========================
       APPROVED

       Use provider's proposed
       date/time and return the
       booking to active status.
    ========================= */

    if (
      normalizedResponse ===
      "approved"
    ) {
      booking.postponedResponse =
        "approved";

      booking.rebookRequested =
        false;

      if (
        booking.postponedDate
      ) {
        booking.bookingDate =
          booking.postponedDate;
      }

      if (
        booking.postponedTime
      ) {
        booking.bookingTime =
          booking.postponedTime;
      }

      booking.status =
        "accepted";

      await booking.save();

      const updatedBooking =
        await Booking.findById(
          booking._id
        )
          .populate("service")
          .populate(
            "user",
            "name email phone"
          );

      return res.json({
        message:
          "New booking date approved successfully. The booking is active again and is waiting for completion.",

        booking:
          updatedBooking
      });
    }

    /* =========================
       REBOOK REQUEST

       Original booking is
       closed.

       It remains in MongoDB
       and appears in history.

       Customer can create a
       completely new booking.
    ========================= */

    booking.postponedResponse =
      "rebook";

    booking.rebookRequested =
      true;

    booking.status =
      "cancelled";

    await booking.save();

    const updatedBooking =
      await Booking.findById(
        booking._id
      )
        .populate("service")
        .populate(
          "user",
          "name email phone"
        );

    return res.json({
      message:
        "Rebooking requested. The original booking has been closed. Please create a new booking with your preferred date and time.",

      booking:
        updatedBooking
    });

  } catch (err) {
    console.error(
      "RESPOND TO POSTPONED BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
DECLINE BOOKING

DECLINED BOOKINGS GO TO
HISTORY.
========================= */
export const declineBooking = async (
  req,
  res
) => {
  try {
    const {
      reason
    } = req.body;

    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("service");

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    if (
      req.user.role ===
        "serviceProvider" &&
      (
        !booking.service ||
        !booking.service.provider ||
        booking.service.provider.toString() !==
          req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to manage this booking."
      });
    }

    if (
      ![
        "pending",
        "accepted",
        "postponed"
      ].includes(
        booking.status
      )
    ) {
      return res.status(400).json({
        message:
          "This booking is no longer active."
      });
    }

    booking.status =
      "declined";

    booking.declinedAt =
      new Date();

    booking.declineReason =
      reason || "";

    await booking.save();

    res.json({
      message:
        "Booking declined",

      booking
    });

  } catch (err) {
    console.error(
      "DECLINE BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
COMPLETE BOOKING

COMPLETED BOOKINGS GO TO
HISTORY.
========================= */
export const completeBooking = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("service");

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    if (
      req.user.role ===
        "serviceProvider" &&
      (
        !booking.service ||
        !booking.service.provider ||
        booking.service.provider.toString() !==
          req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to manage this booking."
      });
    }

    if (
      booking.status !==
      "accepted"
    ) {
      return res.status(400).json({
        message:
          "Only accepted bookings can be completed."
      });
    }

    booking.status =
      "completed";

    booking.completedAt =
      new Date();

    await booking.save();

    res.json({
      message:
        "Booking completed",

      booking
    });

  } catch (err) {
    console.error(
      "COMPLETE BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
VIEW BOOKING DETAILS
========================= */
export const getBookingDetails = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      )
        .populate("service")
        .populate(
          "user",
          "name email phone"
        );

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    /* =========================
       PROVIDER OWNERSHIP
    ========================= */

    if (
      req.user.role ===
        "serviceProvider" &&
      (
        !booking.service ||
        !booking.service.provider ||
        booking.service.provider.toString() !==
          req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to view this booking."
      });
    }

    /* =========================
       CUSTOMER OWNERSHIP
    ========================= */

    if (
      req.user.role ===
        "user" &&
      booking.user &&
      booking.user._id.toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You are not authorized to view this booking."
      });
    }

    /* =========================
       CUSTOMER DELETED

       ONLY HIDE FROM CUSTOMER.
       PROVIDER AND ADMIN CAN
       STILL VIEW THE BOOKING.
    ========================= */

    if (
      req.user.role ===
        "user" &&
      booking.customerDeleted ===
        true
    ) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    res.json(
      booking
    );

  } catch (err) {
    console.error(
      "GET BOOKING DETAILS ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};

/* =========================
DELETE MY BOOKING

IMPORTANT:
DO NOT DELETE DATABASE
RECORD.

Customer only hides the
booking from their account.

Provider history and
analytics remain intact.
========================= */
export const deleteBooking = async (
  req,
  res
) => {
  try {
    const booking =
      await Booking.findById(
        req.params.id
      );

    if (!booking) {
      return res.status(404).json({
        message:
          "Booking not found"
      });
    }

    /* =========================
       CUSTOMER OWNERSHIP
    ========================= */

    if (
      booking.user.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Not authorized"
      });
    }

    /* =========================
       SOFT DELETE

       DO NOT USE:
       findByIdAndDelete()

       The booking remains in
       MongoDB for the provider,
       history and analytics.
    ========================= */

    booking.customerDeleted =
      true;

    await booking.save();

    res.json({
      message:
        "Booking removed from your bookings successfully"
    });

  } catch (err) {
    console.error(
      "DELETE BOOKING ERROR:",
      err
    );

    res.status(500).json({
      message:
        err.message
    });
  }
};