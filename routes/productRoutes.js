const express = require("express");
const mongoose = require("mongoose");
const { getAllProducts, getProductsByCategory, getProductById } = require("../controllers/productController");
const Review = require("../models/Review");

const router = express.Router();

/**
 * GET /api/products
 * Optional: ?category=men|women|kids
 */
router.get("/", getAllProducts);

/**
 * GET /api/products/category/:category
 * Fetch products based on the category (men, women, or kids)
 */
router.get("/category/:category", getProductsByCategory);

/**
 * GET /api/products/:id (fetch product and its associated reviews)
 * Fetch a product by its MongoDB _id along with its reviews
 */
router.get("/:id", getProductById);

/**
 * GET /api/products/:id/reviews (fetch reviews for a specific product)
 * This route will fetch all reviews associated with a product by its Mongo _id
 */
router.get("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product id
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    // Fetch reviews for the given product
    const reviews = await Review.find({ productId: id }).lean();
    const formattedReviews = reviews.map((review) => ({
      id: review._id.toString(),
      name: review.name,
      review: review.review,
      stars: review.stars,
    }));

    // Return reviews
    return res.json(formattedReviews);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/products/:id/reviews (submit a review for a specific product)
 * This route allows users to submit reviews for a product
 */
router.post("/:id/reviews", async (req, res) => {
  try {
    const { id } = req.params;  // Extract the product ID from the URL
    const { name, review, stars } = req.body;  // Extract review data from the body

    // Log the incoming data for debugging
    // console.log("Received review data:", { name, review, stars });

    // Validate the product ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    // Validate review data
    if (!name || !review || !stars) {
      return res.status(400).json({ message: "Name, review, and stars are required" });
    }

    // Create a new review instance
    const newReview = new Review({
      productId: id,
      name,
      review,
      stars,
    });

    // Save the review to the database
    await newReview.save();

    // console.log("Review saved:", newReview);

    // Return the saved review as a response
    res.status(201).json({
      id: newReview._id.toString(),
      name: newReview.name,
      review: newReview.review,
      stars: newReview.stars,
    });  // 201 status indicates resource created
  } catch (err) {
    console.error("Error saving review:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Back-compat route (this is redundant now, but kept for backward compatibility):
 * GET /api/products/id/:id -> fetch product by Mongo _id (same as above)
 */
router.get("/id/:id", getProductById);

module.exports = router;
