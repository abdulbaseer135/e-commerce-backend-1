// routes/orderRoutes.js
const express = require("express");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const authMiddleware = require("../middleware/authMiddleware"); // verifies JWT, sets req.user.id

const router = express.Router();

/**
 * POST /api/orders
 * Creates an order for the authenticated user, then clears their cart.
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Trust the server-side user id over anything sent by the client
    const userId = req.user.id;

    // Build the payload, forcing customer.id to server user id
    const payload = {
      ...req.body,
      customer: {
        ...(req.body.customer || {}),
        id: userId,
      },
    };

    // Optional: basic safety—derive subtotal/grandTotal if missing
    if (!payload.totals) payload.totals = {};
    if (!payload.items) payload.items = [];

    if (payload.items.length > 0) {
      const subtotal =
        payload.items.reduce((s, it) => s + Number(it.lineTotal || (it.price || 0) * (it.quantity || 0)), 0) || 0;
      if (payload.totals.subtotal == null) payload.totals.subtotal = subtotal;
      if (payload.totals.grandTotal == null) {
        const tax = Number(payload.totals.tax || 0);
        const shipping = Number(payload.totals.shipping || 0);
        const discount = Number(payload.totals.discount || 0);
        payload.totals.grandTotal = subtotal + tax + shipping - discount;
      }
      if (!payload.totals.currency) payload.totals.currency = "usd";
    }

    // Create order
    const order = await Order.create(payload);

    // Clear the user's cart on the server (keeps DB in sync)
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    // Return the new order id (and optionally the order)
    return res.status(201).json({ orderId: order._id });
  } catch (e) {
    console.error("Create order error:", e);
    return res.status(500).json({ message: "Failed to save order" });
  }
});

/**
 * GET /api/orders/:id
 * Returns a single order (optionally you could require auth & ownership check)
 */
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Not found" });
    return res.json({ order });
  } catch (e) {
    return res.status(500).json({ message: "Error fetching order" });
  }
});

module.exports = router;
