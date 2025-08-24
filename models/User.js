const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// User schema definition
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

// Pre-save hook to hash the password before storing it in the database
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();  // Proceed only if password is modified
  try {
    const salt = await bcrypt.genSalt(10);  // Generate salt
    this.password = await bcrypt.hash(this.password, salt);  // Hash password
    next();  // Proceed with save
  } catch (err) {
    next(err);  // Handle errors in password hashing
  }
});

// Method to compare entered password with stored hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);  // Compare passwords
  } catch (err) {
    throw new Error("Error comparing passwords");
  }
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  try {
    const token = jwt.sign({ id: this._id, email: this.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',  // Set token expiry time
    });
    console.log("Generated JWT Token:", token); 
    } catch (err) {
    throw new Error("Error generating token");
  }
};

const User = mongoose.model("User", userSchema);  // Create model based on schema

module.exports = User;  // Export the model
