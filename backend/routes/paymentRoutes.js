import express from "express";

import {
  initializePayment,
  verifyPayment
} from "../controllers/paymentController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   INITIALIZE PAYMENT
========================= */

router.post(
  "/initialize",
  protect,
  initializePayment
);

/* =========================
   VERIFY PAYMENT
========================= */

router.get(
  "/verify/:reference",
  protect,
  verifyPayment
);

export default router;