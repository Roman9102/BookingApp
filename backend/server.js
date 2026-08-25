import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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

/* =========================================================
   PATH SETUP
========================================================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.resolve(
  __dirname,
  "uploads"
);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, {
    recursive: true
  });
}

/* =========================================================
   SOCKET.IO
========================================================= */

export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH"
    ]
  }
});

io.on("connection", (socket) => {
  console.log(
    "Socket connected:",
    socket.id
  );

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS"
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept"
    ]
  })
);

/* =========================================================
   PAYSTACK WEBHOOK
   MUST COME BEFORE express.json()
========================================================= */

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

      console.error(
        "PAYSTACK WEBHOOK PARSE ERROR:",
        err
      );

      return res.status(400).json({
        message:
          "Invalid webhook payload."
      });

    }

    next();

  },
  paystackWebhook
);

/* =========================================================
   BODY PARSERS
========================================================= */

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true
  })
);

/* =========================================================
   STATIC UPLOADS
========================================================= */

app.use(
  "/uploads",
  express.static(
    UPLOADS_DIR,
    {
      fallthrough: false,
      maxAge: "1d"
    }
  )
);

/* =========================================================
   ROOT / HEALTH CHECK
========================================================= */

app.get(
  "/",
  (req, res) => {

    res.json({
      message:
        "QuickConnect API is running",
      uploads:
        "/uploads"
    });

  }
);

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      status:
        "ok"
    });

  }
);

/* =========================================================
   ROUTES
========================================================= */

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

app.use(
  "/api/password",
  passwordRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

/* =========================================================
   404 HANDLER
========================================================= */

app.use(
  (req, res) => {

    res.status(404).json({
      message:
        "Route not found.",
      path:
        req.originalUrl
    });

  }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use(
  (err, req, res, next) => {

    console.error(
      "SERVER ERROR:",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(
      err.status || 500
    ).json({
      message:
        err.message ||
        "Internal server error."
    });

  }
);

/* =========================================================
   DATABASE
========================================================= */

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

    console.error(
      "MongoDB error:",
      err
    );

  });

/* =========================================================
   START SERVER
========================================================= */

const PORT =
  process.env.PORT || 5000;

server.listen(
  PORT,
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      "Uploads directory:",
      UPLOADS_DIR
    );

    console.log(
      "Static image URL:",
      "/uploads/<filename>"
    );

  }
);