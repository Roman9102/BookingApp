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

const UPLOADS_DIR = path.resolve(__dirname, "uploads");

/*
  Always create the uploads directory.

  This prevents image uploads from breaking after a restart
  or when the deployment environment starts with no uploads
  folder.
*/

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
  console.log("Admin connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
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
      const rawBody = req.body.toString();

      req.body = JSON.parse(rawBody);
    } catch (err) {
      console.error(
        "PAYSTACK WEBHOOK PARSE ERROR:",
        err
      );

      return res.status(400).json({
        message: "Invalid webhook payload."
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
   IMPORTANT FOR SERVICE IMAGES
   ========================================================= */

/*
  IMPORTANT:

  Do NOT use:

      express.static("uploads")

  because that depends on the directory from which
  Node was started.

  We use the absolute uploads directory instead.

  Therefore:

      /uploads/example.jpg

  always points to:

      Backend/uploads/example.jpg
*/

app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    fallthrough: false,
    maxAge: "7d"
  })
);

/* =========================================================
   BASIC SERVER TEST
   ========================================================= */

app.get(
  "/",
  (req, res) => {
    res.json({
      message: "QuickConnect API is running.",
      uploads: "/uploads",
      status: "online"
    });
  }
);

/* =========================================================
   API ROUTES
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

/* =========================================================
   PASSWORD RESET
   ========================================================= */

app.use(
  "/api/password",
  passwordRoutes
);

/* =========================================================
   PAYMENTS
   ========================================================= */

app.use(
  "/api/payments",
  paymentRoutes
);

/* =========================================================
   SUBSCRIPTIONS
   ========================================================= */

app.use(
  "/api/subscriptions",
  subscriptionRoutes
);

/* =========================================================
   API 404 HANDLER
   ========================================================= */

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      message: "API endpoint not found."
    });
  }
);

/* =========================================================
   GENERAL ERROR HANDLER
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
      "Image URL format:",
      `/uploads/<filename>`
    );
  }
);