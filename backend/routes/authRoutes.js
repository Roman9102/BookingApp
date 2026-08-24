import express from "express";

import {
  register,
  login,
  getProfile,
  updatePersonalInfo,
  updateBusinessInfo,
  changePassword,
  deleteAccount
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ========================
   REGISTER
======================== */

router.post(
  "/register",
  register
);

/* ========================
   LOGIN
======================== */

router.post(
  "/login",
  login
);

/* ========================
   SETTINGS
======================== */

/* GET CURRENT PROFILE */
router.get(
  "/profile",
  protect,
  getProfile
);

/* UPDATE PERSONAL INFORMATION */
router.put(
  "/profile/personal",
  protect,
  updatePersonalInfo
);

/* UPDATE BUSINESS INFORMATION */
router.put(
  "/profile/business",
  protect,
  updateBusinessInfo
);

/* CHANGE PASSWORD */
router.put(
  "/change-password",
  protect,
  changePassword
);

/* DELETE ACCOUNT */
router.delete(
  "/account",
  protect,
  deleteAccount
);

export default router;