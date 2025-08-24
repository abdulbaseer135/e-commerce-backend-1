const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware"); // Import auth middleware

const router = express.Router();

/** httpOnly cookie options */
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

/** ===========================
 *  POST /api/users/signup
 *  Creates user, sets cookie, returns user (auto-login)
 *  =========================== */
router.post("/signup", async (req, res) => {
  try {
    const { fullName, email, phone, password } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    // Create a new user with the given data (password will be hashed in the User model)
    const newUser = await User.create({ fullName, email, phone, password });

    // Generate JWT token using the generateAuthToken method from the User model
    const token = newUser.generateAuthToken();

    // Set the token in the cookie
    res.cookie("token", token, cookieOpts);

    // Send response with the token and user details
    return res.status(201).json({
      message: "Signup successful",
      token, // Kept for backward compatibility
      user: { id: newUser._id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone },
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/** ===========================
 *  POST /api/users/login
 *  Verifies credentials, sets cookie, returns user
 *  =========================== */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Compare the entered password with the stored hashed password using matchPassword method
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token using the generateAuthToken method from the User model
    const token = user.generateAuthToken();

    // Set the token in the cookie
    res.cookie("token", token, cookieOpts);

    // Send response with the token and user details
    return res.json({
      message: "Login successful",
      token, // Kept for backward compatibility
      user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/** ===========================
 *  POST /api/users/logout
 *  Clears cookie
 *  =========================== */
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", { ...cookieOpts, maxAge: 0 });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

/** ===========================
 *  GET /api/users/me
 *  Returns current user if cookie is valid
 *  =========================== */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("_id fullName email phone"); // `req.user.id` comes from the middleware
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone } });
  } catch (e) {
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
