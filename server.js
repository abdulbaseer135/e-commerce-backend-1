const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const stripe = require("stripe");
require("dotenv").config();

const app = express();

// JWT Authentication Middleware (to be applied to protected routes)
const authMiddleware = require("./middleware/authMiddleware");

// Import User model (needed to access user data)
const User = require("./models/User");

// CORS configuration for handling requests from the frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Frontend URL in env
    credentials: true,  // Allow cookies to be sent with requests
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(cookieParser()); // Middleware to parse cookies

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY); // Stripe instance with secret key

// Middleware to parse JSON request bodies
app.use(express.json());

// Importing route handlers
const authRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes"); // Handle product details and reviews
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const contactRoutes = require("./routes/contactRoutes");

// Using the routes
app.use("/api/users", authRoutes);
app.use("/api/products", productRoutes);  // Handle product details and reviews
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);

// Protected route example (getting current user details)
app.get("/api/users/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);  // `req.user.id` comes from the middleware
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Stripe: create & confirm payment (protected route)
app.post("/api/payment-intent", authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const amountInCents = Math.round(amount * 100); // Convert dollars to cents

    // Use email from JWT token (provided by authMiddleware)
    const paymentEmail = req.user.email;

    // Create payment intent using Stripe API
    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountInCents,       // Amount in cents
      currency: "usd",             // Currency
      payment_method_types: ["card"], // Specify allowed payment methods
      receipt_email: paymentEmail,   // Email for receipt
    });

    // Send the client secret back to the frontend
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook to handle payment events
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  switch (event.type) {
    case "payment_intent.succeeded":
      // console.log("PaymentIntent was successful!", event.data.object?.id);
      break;
    case "payment_intent.payment_failed":
      // console.log("PaymentIntent failed:", event.data.object?.id);
      break;
    default:
      // console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send("Event received");
});

// JSON 404 handler for unrecognized API routes
app.use("/api", (req, res) => {
  return res.status(404).json({ message: "API route not found" });
});

// Global error handler (returns JSON for API errors)
app.use((err, req, res, next) => {
  console.error("API error:", err);
  if (req.path.startsWith("/api")) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
  return res.status(500).send("Internal Server Error");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
