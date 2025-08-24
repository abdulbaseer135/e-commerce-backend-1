const Cart = require('../models/Cart');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Ensure the user has a cart doc (with upsert: true to handle duplicates)
async function getOrCreateCart(userId) {
  const cart = await Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId, items: [] } },  // Create new cart only if it doesn't exist
    { upsert: true, new: true }  // `new: true` ensures the updated or newly created cart is returned
  );
  return cart;
}

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', 'title price images stock'); // adjust fields
    if (!cart) return res.json({ items: [], total: 0 });
    res.json({
      items: cart.items.map(i => ({
        product: i.product,
        qty: i.qty,
        priceAtAdd: i.priceAtAdd,
        lineTotal: i.qty * i.priceAtAdd,
      })),
      total: cart.items.reduce((s, i) => s + i.qty * i.priceAtAdd, 0),
      updatedAt: cart.updatedAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cart' });
  }
};

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, qty = 1 } = req.body;
    
    // Validate the productId
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    if (qty < 1) return res.status(400).json({ message: 'Invalid quantity' });

    const product = await Product.findById(productId).select('price stock');
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Optional: stock check
    if (product.stock !== undefined && product.stock < qty) {
      return res.status(400).json({ message: 'Not enough stock' });
    }

    const cart = await getOrCreateCart(req.user.id);

    // Check if the product already exists in the cart
    const idx = cart.items.findIndex(i => i.product.toString() === productId);
    if (idx > -1) {
      // Product exists, update quantity
      cart.items[idx].qty += qty;
    } else {
      // Product doesn't exist, add new product to cart
      cart.items.push({
        product: productId,
        qty,
        priceAtAdd: product.price
      });
    }

    await cart.save();
    const populated = await cart.populate('items.product', 'title price images stock');
    res.status(201).json({
      message: 'Added to cart',
      cart: {
        items: populated.items,
        total: populated.items.reduce((s, i) => s + i.qty * i.priceAtAdd, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add to cart' });
  }
};

// Update item quantity in cart
exports.updateItemQty = async (req, res) => {
  try {
    const { productId } = req.params;
    const { qty } = req.body;

    // Validate the productId
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'qty must be >= 1' });
    }

    const cart = await getOrCreateCart(req.user.id);
    const item = cart.items.find(i => i.product.toString() === productId);
    if (!item) return res.status(404).json({ message: 'Item not in cart' });

    item.qty = qty;
    await cart.save();
    const populated = await cart.populate('items.product', 'title price images stock');
    res.json({
      message: 'Quantity updated',
      cart: {
        items: populated.items,
        total: populated.items.reduce((s, i) => s + i.qty * i.priceAtAdd, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update item' });
  }
};

// Remove item from cart (completely remove the product, not just decrementing the quantity)
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate the productId
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid productId' });
    }

    const cart = await getOrCreateCart(req.user.id);

    // Remove the product from the cart's items (remove the whole product)
    const nextItems = cart.items.filter(i => i.product.toString() !== productId);

    if (nextItems.length === cart.items.length) {
      // If no item was removed, return a 404
      return res.status(404).json({ message: 'Item not in cart' });
    }

    cart.items = nextItems;
    await cart.save();
    const populated = await cart.populate('items.product', 'title price images stock');
    res.json({
      message: 'Removed from cart',
      cart: {
        items: populated.items,
        total: populated.items.reduce((s, i) => s + i.qty * i.priceAtAdd, 0)
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove item' });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);
    cart.items = [];
    await cart.save();
    res.json({ message: 'Cart cleared', items: [], total: 0 });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};
