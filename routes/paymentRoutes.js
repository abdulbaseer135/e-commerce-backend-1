const express = require("express");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);  // Use your Stripe secret key from .env
const sendEmailConfirmation = require("../services/emailService");  // Import the email service
const router = express.Router();

// Create Payment Intent route for Stripe
router.post("/payment-intent", async (req, res) => {
  try {
    const { amount, email } = req.body;  // Get the amount and email from the frontend (sent by the user)

    // Convert amount to cents (Stripe expects the amount in cents)
    const amountInCents = Math.round(amount * 100);  // Stripe expects integer values in cents

    // Create the payment intent using Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
    });

    // Send the client secret back to the frontend (required for Stripe's client-side confirmation)
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).send({ error: error.message });
  }
});

// Route to confirm payment and send the email after successful payment
router.post("/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId, email, orderDetails } = req.body;

    // Confirm the payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // After successful payment, send the email confirmation
      await sendEmailConfirmation(email, orderDetails); // Pass the email and order details

      res.status(200).send({
        message: "Payment successful and confirmation email sent!",
      });
    } else {
      res.status(400).send({
        error: "Payment not successful",
      });
    }
  } catch (error) {
    console.error("Error confirming payment:", error);
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
