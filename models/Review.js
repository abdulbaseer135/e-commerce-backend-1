const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  review: { type: String, required: true },
  stars: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Optional
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
