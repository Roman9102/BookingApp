import jwt from "jsonwebtoken";
import User from "../models/user.js";

/* ========================
   PROTECT MIDDLEWARE
======================== */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

/* ========================
   ADMIN + SERVICE PROVIDER ACCESS
======================== */
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "No user found" });
  }

  const allowedRoles = ["admin", "serviceProvider"];

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Admin only" });
  }

  next();
};