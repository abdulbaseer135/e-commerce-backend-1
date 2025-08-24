const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { jwtSecret, tokenExpire } = require("../config/config"); // Configuration for JWT

// Password validation regex (at least 8 characters, 1 letter, 1 number, and 1 special character)
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;

// Signup Route
const signup = async (req, res) => {
  const { fullName, email, phone, password } = req.body;

  // Step 1: Validate the password (length and criteria)
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ message: "Password must be at least 8 characters long, include a number, a special character, and a letter." });
  }

  try {
    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered" });

    // Create a new user with the given data (password will be hashed in the User model)
    const newUser = await User.create({ fullName, email, phone, password });

    // Create JWT token
    const token = newUser.generateAuthToken(); // Use the generateAuthToken method

    // Send response with the token and user details
    res.status(201).json({
      message: "Signup successful",
      token, // Send token as part of the response
      user: { id: newUser._id, fullName: newUser.fullName, email: newUser.email, phone: newUser.phone }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login Route
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Step 2: Compare the entered password with the stored hashed password using matchPassword method
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Step 3: Generate JWT token
    const token = user.generateAuthToken(); // Use the generateAuthToken method from User model

    // Send response with the token and user details
    res.json({
      message: "Login successful",
      token, // Send token as part of the response
      user: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Logout Route (Unchanged)
const logout = (req, res) => {
  try {
    // Clear the JWT token stored in the cookie
    res.clearCookie('token', {
      httpOnly: true,   // Ensures the cookie is not accessible via JavaScript
      secure: process.env.NODE_ENV === 'production', // Only send cookie over HTTPS in production
      sameSite: 'Strict', // Protects against CSRF attacks by only sending the cookie in same-site requests
      path: '/', // Clears the cookie for the root path (all paths on the domain)
    });

    // Send a success response
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out' });
  }
};

module.exports = { signup, login, logout };
