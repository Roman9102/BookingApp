import express from "express";

import {
  initializeSubscription,
  verifySubscription
} from "../controllers/subscriptionController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   INITIALIZE SUBSCRIPTION
========================= */

router.post(
  "/initialize",
  protect,
  initializeSubscription
);

/* =========================
   VERIFY SUBSCRIPTION
========================= */

router.get(
  "/verify/:reference",
  protect,
  verifySubscription
);

export default router;