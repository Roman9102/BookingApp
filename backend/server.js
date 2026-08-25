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

/* =========================================================
   APP
========================================================= */

const app = express();
const server = http.createServer(app);

/* =========================================================
   ABSOLUTE PATH SETUP
========================================================= */

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

/*
  This MUST be the exact same uploads directory
  used by serviceController.js.

  Backend/
    server.js
    uploads/
*/

const UPLOADS_DIR =
  path.resolve(
    __dirname,
    "uploads"
  );

/*
  Always create uploads directory.
*/

if (
  !fs.existsSync(
    UPLOADS_DIR
  )
) {
  fs.mkdirSync(
    UPLOADS_DIR,
    {
      recursive: true
    }
  );
}

console.log(
  "UPLOADS DIRECTORY:",
  UPLOADS_DIR
);

/* =========================================================
   SOCKET.IO
========================================================= */

export const io =
  new Server(
    server,
    {
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
    }
  );

io.on(
  "connection",
  (socket) => {

    console.log(
      "Admin connected:",
      socket.id
    );

    socket.on(
      "disconnect",
      () => {

        console.log(
          "Socket disconnected:",
          socket.id
        );

      }
    );

  }
);

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
   MUST BE BEFORE JSON PARSER
========================================================= */

app.use(
  "/api/paystack/webhook",

  express.raw({
    type: "application/json"
  }),

  (req, res, next) => {

    req.rawBody =
      req.body;

    try {

      const rawBody =
        Buffer.isBuffer(
          req.body
        )
          ? req.body.toString(
              "utf8"
            )
          : String(
              req.body || ""
            );

      req.body =
        JSON.parse(
          rawBody
        );

    } catch (error) {

      console.error(
        "PAYSTACK WEBHOOK PARSE ERROR:",
        error
      );

      return res.status(
        400
      ).json({
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
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

/* =========================================================
   STATIC UPLOADS
========================================================= */

/*
  IMPORTANT:

  NEVER use:

      express.static("uploads")

  because that depends on the directory from which
  Node was started.

  We use the absolute path instead.

  Database:

      /uploads/example.jpg

  Browser requests:

      https://quickconnect-api-m617.onrender.com/uploads/example.jpg

  Express serves:

      Backend/uploads/example.jpg
*/

app.use(
  "/uploads",
  express.static(
    UPLOADS_DIR,
    {
      fallthrough: true,
      index: false,
      redirect: false,
      maxAge: "7d"
    }
  )
);

/*
  Explicit image diagnostic route.

  This makes it much easier to identify whether an image
  exists physically on the server.
*/

app.get(
  "/uploads/:filename",
  (req, res, next) => {

    const filename =
      path.basename(
        req.params.filename
      );

    const filePath =
      path.resolve(
        UPLOADS_DIR,
        filename
      );

    const uploadsRoot =
      path.resolve(
        UPLOADS_DIR
      ) + path.sep;

    if (
      !filePath.startsWith(
        uploadsRoot
      )
    ) {
      return res.status(
        400
      ).json({
        message:
          "Invalid image path."
      });
    }

    if (
      !fs.existsSync(
        filePath
      )
    ) {
      return res.status(
        404
      ).json({
        message:
          "Image file not found.",
        filename
      });
    }

    return res.sendFile(
      filePath
    );

  }
);

/* =========================================================
   BASIC SERVER TEST
========================================================= */

app.get(
  "/",
  (req, res) => {

    res.json({
      message:
        "QuickConnect API is running.",

      status:
        "online",

      uploads:
        "/uploads",

      imageFormat:
        "/uploads/<filename>"
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
   API 404
========================================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(
      404
    ).json({
      message:
        "API endpoint not found."
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

    if (
      res.headersSent
    ) {
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
  .then(
    () => {

      console.log(
        "MongoDB connected"
      );

    }
  )
  .catch(
    (error) => {

      console.error(
        "MongoDB error:",
        error
      );

    }
  );

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
      "/uploads/<filename>"
    );

  }
);