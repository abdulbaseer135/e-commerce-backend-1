const mongoose = require("mongoose");

// helper to keep money values at 2 decimals (stored as Number in dollars)
const money = (v) => (typeof v === "number" ? Math.round(v * 100) / 100 : v);

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    image: { type: String },                 // optional snapshot
    price: { type: Number, required: true, set: money }, // per unit in dollars
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, set: money }, // qty * price (dollars)
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // snapshot of the customer at time of order
    customer: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fullName: String,
      email: String,
      phone: String,
    },

    items: { type: [orderItemSchema], default: [] },

    // totals in dollars (frontend: subtotal + tax = grandTotal)
    totals: {
      subtotal: { type: Number, set: money, default: 0 },
      tax: { type: Number, set: money, default: 0 },          // new: explicit tax
      discount: { type: Number, set: money, default: 0 },     // new: coupon/discount
      shipping: { type: Number, set: money, default: 0 },     // new: if you add shipping
      grandTotal: { type: Number, set: money, required: true },
      currency: { type: String, default: "usd" },
      couponCode: { type: String },                           // new: optional coupon code
    },

    // shipping/contact snapshot (expand as needed)
    shipping: {
      name: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String, // you already send this from Checkout
      country: String,
    },

    // payment details (Stripe)
    payment: {
      provider: { type: String, default: "stripe" },
      paymentIntentId: String,
      amountReceived: Number,  // cents from Stripe
      status: String,          // "succeeded", etc.
      receiptEmail: String,
      cardBrand: String,
      last4: String,
    },

    // explicit order status
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded", "cancelled"],
      default: "paid", // your flow saves only after success
    },

    // simple human-friendly order number (optional)
    orderNo: {
      type: String,
      default: () => `ORD-${Date.now()}`,
      unique: true,
    },
  },
  { timestamps: true }
);

// useful indexes
orderSchema.index({ "customer.id": 1, createdAt: -1 });
orderSchema.index({ orderNo: 1 }, { unique: true });

// safety: compute subtotal/tax/grandTotal if not provided (optional)
orderSchema.pre("validate", function (next) {
  try {
    const items = this.items || [];
    const subtotal = items.reduce((s, it) => s + (it.lineTotal || 0), 0);
    if (this.totals && (this.totals.subtotal == null || Number.isNaN(this.totals.subtotal))) {
      this.totals.subtotal = money(subtotal);
    }
    // If grandTotal not provided, derive it
    if (this.totals) {
      const t = this.totals;
      if (t.grandTotal == null || Number.isNaN(t.grandTotal)) {
        const calc =
          (t.subtotal || 0) + (t.tax || 0) + (t.shipping || 0) - (t.discount || 0);
        this.totals.grandTotal = money(calc);
      }
    }
    next();
  } catch (e) {
    next(e);
  }
});

module.exports = mongoose.model("Order", orderSchema);
