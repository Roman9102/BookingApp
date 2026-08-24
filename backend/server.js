import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import passwordRoutes from "./routes/passwordRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import { paystackWebhook } from "./webhooks/paystackWebhook.js";

const app = express();
const server = http.createServer(app);


/* ================= SOCKET.IO ================= */

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ]
  }
});

io.on("connection", (socket) => {
  console.log(
    "Admin connected:",
    socket.id
  );
});


/* ================= MIDDLEWARE ================= */

app.use(cors());


/* ================= PAYSTACK WEBHOOK =================
   MUST COME BEFORE express.json()
====================================================== */

app.use(
  "/api/paystack/webhook",
  express.raw({
    type: "application/json"
  }),
  (req, res, next) => {

    req.rawBody = req.body;

    try {
      req.body = JSON.parse(
        req.body.toString()
      );
    } catch (err) {
      return res.status(400).json({
        message:
          "Invalid webhook payload."
      });
    }

    next();
  },
  paystackWebhook
);


/* ================= BODY PARSERS ================= */

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  "/uploads",
  express.static("uploads")
);


/* ================= ROUTES ================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/services",
  serviceRoutes
);

app.use(
  "/api/bookings",
  bookingRoutes
);

app.use(
  "/api/admin",
  adminRoutes
);


/* ================= PASSWORD RESET ================= */

app.use(
  "/api/password",
  passwordRoutes
);


/* ================= PAYMENTS ================= */

app.use(
  "/api/payments",
  paymentRoutes
);


/* ================= SUBSCRIPTIONS ================= */

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);


/* ================= DATABASE ================= */

mongoose
  .connect(
    process.env.MONGO_URI
  )
  .then(() => {
    console.log(
      "MongoDB connected"
    );
  })
  .catch((err) => {
    console.log(
      "MongoDB error:",
      err
    );
  });


/* ================= START SERVER ================= */

const PORT =
  process.env.PORT || 5000;

server.listen(
  PORT,
  () => {
    console.log(
      `Server running on http://localhost:${PORT}`
    );
  }
);