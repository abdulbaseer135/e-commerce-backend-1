const Contact = require('../models/Contact');

// Handle contact form submission
exports.submitContactForm = async (req, res) => {
  const { name, email, phone, message } = req.body;

  // Check if all required fields are present
  if (!name || !email || !phone || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Create a new contact form entry
    const newContact = new Contact({
      name,
      email,
      phone,
      message
    });

    // Save the contact data in the database
    await newContact.save();
    res.status(200).json({ message: "Message sent successfully." });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};
