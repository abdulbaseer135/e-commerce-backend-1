const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Cart = require('../models/Cart');
const Product = require('../models/Product');
const authMiddleware = require('../middleware/authMiddleware'); // verify JWT middleware

// Safely stringify an ObjectId or populated doc or string
const canon = (v) => {
  try {
    if (!v) return '';
    // if populated document: use _id
    if (typeof v === 'object' && v._id) return String(v._id);
    return String(v);
  } catch {
    return '';
  }
};

const ensureArray = (arr) => (Array.isArray(arr) ? arr : []);

/* =========================
   GET current user's cart
   ========================= */
router.get('/', authMiddleware, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
      await cart.populate('items.product');
    }

    // Remove any malformed items (rare but defensive)
    cart.items = ensureArray(cart.items).filter((i) => i && i.product);
    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (err) {
    console.error('Cart GET error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ==============================================
   POST /add  (add or increment/decrement by qty)
   Body: { productId, quantity = 1 }
   ============================================== */
router.post('/add', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body || {};

    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    // Ensure product exists so we don't create orphaned lines
    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ message: 'Product not found' });

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });

    // Defensive cleaning
    cart.items = ensureArray(cart.items).filter((i) => i && i.product);

    const pid = canon(productId);
    const idx = cart.items.findIndex((i) => canon(i.product) === pid);

    const delta = Number(quantity) || 0;

    if (idx > -1) {
      // increment/decrement existing
      const nextQty = (cart.items[idx].quantity || 0) + delta;
      if (nextQty <= 0) {
        cart.items.splice(idx, 1);
      } else {
        cart.items[idx].quantity = nextQty;
      }
    } else if (delta > 0) {
      // add as new only if positive
      cart.items.push({ product: productId, quantity: delta });
    }
    // if delta <= 0 and item didn't exist, ignore

    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (err) {
    console.error('Cart ADD error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ==============================================
   POST /update  (set exact quantity)
   Body: { productId, quantity }
   ============================================== */
router.post('/update', authMiddleware, async (req, res) => {
  try {
    const { productId, quantity } = req.body || {};
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    const qty = Math.max(1, Number(quantity) || 1);

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.json({ items: [] });

    cart.items = ensureArray(cart.items).filter((i) => i && i.product);

    const pid = canon(productId);
    const item = cart.items.find((i) => canon(i.product) === pid);
    if (!item) return res.status(404).json({ message: 'Item not found in cart' });

    item.quantity = qty;

    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (err) {
    console.error('Cart UPDATE error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   POST /remove  (by product)
   ========================= */
router.post('/remove', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.body || {};
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const pid = canon(productId);
    cart.items = ensureArray(cart.items).filter((i) => canon(i?.product) !== pid);

    await cart.save();
    await cart.populate('items.product');

    res.json(cart);
  } catch (err) {
    console.error('Cart REMOVE error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* =========================
   POST /clear
   ========================= */
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
      await cart.save();
    } else {
      cart.items = [];
      await cart.save();
    }

    await cart.populate('items.product'); // will be empty
    res.json(cart);
  } catch (err) {
    console.error('Cart CLEAR error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
