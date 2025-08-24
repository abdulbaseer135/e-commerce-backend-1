// routes/reviewRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');  // Ensure this path is correct
const router = express.Router();

// POST route to submit reviews
router.post('/', async (req, res) => {
  const { name, review, stars, productId } = req.body;

  // Check if all required fields are provided
  if (!name || !review || !stars || !productId) {
    console.error('Missing required fields:', { name, review, stars, productId });
    return res.status(400).json({ message: 'All fields (name, review, stars, productId) are required' });
  }

  // Validate productId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  try {
    const newReview = new Review({ name, review, stars, productId });
    await newReview.save();
    res.status(201).json(newReview); // Respond with the saved review
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({ message: 'Error saving review', error });
  }
});

// GET route to fetch reviews by productId
router.get('/:productId', async (req, res) => {
  const { productId } = req.params;

  // Validate productId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: 'Invalid productId' });
  }

  try {
    const reviews = await Review.find({ productId });
    if (reviews.length === 0) {
      return res.status(404).json({ message: 'No reviews found for this product' });
    }
    res.status(200).json(reviews); // Respond with the reviews for the product
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews', error });
  }
});

module.exports = router;

