const mongoose = require("mongoose");
const Product = require("../models/Product");
const Review = require("../models/Review");

// Helper to convert MongoDB's _id to a client-friendly id field
const toClient = (doc) => {
  if (!doc) return doc;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
};

// GET /api/products  (optionally supports ?category=men|women|kids)
exports.getAllProducts = async (req, res) => {
  try {
    const validCats = ["men", "women", "kids"];
    const category = String(req.query.category || "").toLowerCase();
    const filter = validCats.includes(category) ? { category: category } : {};

    // Use lean for performance, then normalize ids
    const products = await Product.find(filter).lean();
    const formattedProducts = products.map(toClient);

    // Return a plain array of products
    return res.json(formattedProducts);
  } catch (err) {
    console.error("getAllProducts error:", err);
    return res.status(500).json({ message: "Server error while fetching products" });
  }
};

// GET /api/products/category/:category
exports.getProductsByCategory = async (req, res) => {
  try {
    const validCats = ["men", "women", "kids"];
    const category = String(req.params.category || "").toLowerCase();

    if (!validCats.includes(category)) {
      return res.status(400).json({ message: "Invalid category provided" });
    }

    // Fetch products by category
    const products = await Product.find({ category }).lean();
    const formattedProducts = products.map(toClient);

    return res.json(formattedProducts);
  } catch (err) {
    console.error("getProductsByCategory error:", err);
    return res.status(500).json({ message: "Server error while fetching category products" });
  }
};

// GET /api/products/:id (fetch product by ID and reviews)
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the provided ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    // Fetch the product
    const product = await Product.findById(id).lean();
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const formattedProduct = toClient(product);

    // Fetch associated reviews using productId (since your model uses productId)
    const reviews = await Review.find({ productId: product._id }).lean();
    const formattedReviews = reviews.map((review) => ({
      id: review._id.toString(),
      name: review.name,
      review: review.review,
      stars: review.stars,
    }));

    // Return product details along with reviews
    return res.json({ product: formattedProduct, reviews: formattedReviews });
  } catch (err) {
    console.error("getProductById error:", err);
    return res.status(500).json({ message: "Server error while fetching product" });
  }
};
