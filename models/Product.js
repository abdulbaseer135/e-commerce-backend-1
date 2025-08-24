// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, enum: ["men", "women", "kids"], required: true, index: true },
    image: { type: String, default: "" },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// expose `id` (string) instead of `_id`, drop __v
productSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString(); // <-- ensure string
    delete ret._id;
  },
});

module.exports = mongoose.model("Product", productSchema);
