import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: '../.env' })


import express from "express";
import cors from "cors";
import Stripe from "stripe";
import helmet from "helmet";
import { supabase, mobileMoneyHelpers } from "./config/supabase.js";

import mobileMoneyRoutes from "./routes/mobile-money.js";
import stripeCustomerRoutes from "./routes/stripe-customer.js";
import algorandSyncRoutes from "./routes/algorand-sync.js";
import deployRoutes from "./routes/deploy.js";
import supabaseMigrationsRoutes from "./routes/supabase-migrations.js";
import algorandDeployRoutes from "./routes/algorand-deploy.js";

// Import the Algorand Event Listener class
import AlgorandEventListener from "./services/algorandEventListener.js";

const app = express();
const port = process.env.PORT || 3001;

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY);
console.log(
  "STRIPE_SECRET_KEY:",
  !!process.env.STRIPE_SECRET_KEY ? "Set" : "Not set"
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helmet security headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "http://localhost:5173", "https://bolt.new"],
    },
  })
);

app.use(
  cors({
    origin: ["http://localhost:5173", "https://bolt.new"],
    credentials: true,
  })
);

app.use(express.json());

// === Routes ===
app.get("/", (req, res) => {
  res.send("Samoa Virtual Bankcard Backend Server");
});

app.get("/api/test", (req, res) => {
  res.json({
    message: "Backend server running",
    timestamp: new Date().toISOString(),
    stripe_configured: !!process.env.STRIPE_SECRET_KEY,
    supabase_configured: !!process.env.SUPABASE_URL,
    mobile_money_enabled: true,
    stripe_customer_api: true,
    algorand_sync_enabled: true,
    deployment_api: true,
  });
});

// Main API route groups
app.use("/api/mobile-money", mobileMoneyRoutes);
app.use("/api", stripeCustomerRoutes);
app.use("/api/algorand", algorandSyncRoutes);
app.use("/api/deploy", deployRoutes);
app.use("/api/supabase/migrations", supabaseMigrationsRoutes);
app.use("/api/algorand", algorandDeployRoutes);

// === Stripe Payment Intent ===
app.post("/api/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency = "usd" } = req.body;

    const amountInCents = Math.round(parseFloat(amount) * 100);
    console.log("Received amount (converted):", amountInCents, "cents");

    // Temporary lower limit for testing
    const MIN_AMOUNT_CENTS = 50; // $0.50
    // For production, increase to 500 (i.e. $5.00)

    if (!amountInCents || amountInCents < MIN_AMOUNT_CENTS) {
      return res.status(400).json({ error: "Amount must be at least $0.50" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe payment error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// === Confirm Payment ===
app.post("/api/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Error confirming payment:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// === Log Payment ===
app.post("/api/log-payment", async (req, res) => {
  try {
    const { user_id, amount, method } = req.body;

    const { error } = await supabase.from("payments").insert([
      {
        user_id,
        amount,
        method,
        status: "completed",
        created_at: new Date(),
      },
    ]);

    if (error) throw error;
    res.json({ message: "Payment logged" });
  } catch (error) {
    console.error("Payment logging failed:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// === Create Virtual Card ===
app.post("/api/create-virtual-card", async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    const cardNumber = generateCardNumber();
    const cvv = generateCVV();
    const expiry = generateExpiryDate();

    const { data, error } = await supabase.from("cards").insert([
      {
        user_id,
        card_number: cardNumber,
        cvv,
        expiry_date: expiry,
        amount,
        status: "pending",
        stripe_issuing_id: "manual_test",
        created_at: new Date(),
      },
    ]);

    if (error) throw error;

    res.json({
      message: "Card created",
      card: {
        cardNumber,
        cvv,
        expiry,
        amount,
        stripe_issuing_id: "manual_test",
      },
    });
  } catch (error) {
    console.error("Card creation error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// === Utility Functions ===
function generateCardNumber() {
  return Array(4)
    .fill(0)
    .map(() => Math.floor(1000 + Math.random() * 9000))
    .join("-");
}

function generateCVV() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function generateExpiryDate() {
  const now = new Date();
  const expiry = new Date(now.setFullYear(now.getFullYear() + 2));
  const month = String(expiry.getMonth() + 1).padStart(2, "0");
  const year = String(expiry.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📡 API endpoints:`);
  console.log(`   GET  /api/test`);
  console.log(`   POST /api/create-payment-intent`);
  console.log(`   POST /api/confirm-payment`);
  console.log(`   POST /api/create-virtual-card`);
  console.log(`   POST /api/log-payment`);
  console.log(`   📱 Mobile Money endpoints:`);
  console.log(`   POST /api/mobile-money/send`);
  console.log(`   POST /api/mobile-money/receive`);
  console.log(`   GET  /api/mobile-money/transactions/:userId`);
  console.log(`   GET  /api/mobile-money/wallet/:userId`);
  console.log(`   GET  /api/mobile-money/providers`);
  console.log(`   💳 Stripe Customer endpoints:`);
  console.log(`   POST /api/create-stripe-customer`);
  console.log(`   GET  /api/stripe-customer/:userId`);
  console.log(`   PUT  /api/stripe-customer/:userId`);
  console.log(`   🔗 Algorand Sync endpoints:`);
  console.log(`   POST /api/algorand/card-sync`);
  console.log(`   GET  /api/algorand/card/:cardId`);
  console.log(`   GET  /api/algorand/card/:cardId/activity`);
  console.log(`   GET  /api/algorand/cards/user/:userAddress`);
  console.log(`   POST /api/algorand/card/:cardId/activity`);
  console.log(`   POST /api/algorand/sync-event`); // New endpoint

  // Initialize and start the Algorand Event Listener
  const ALGORAND_APP_ID = parseInt(process.env.VITE_ALGORAND_APP_ID || '0');
  if (ALGORAND_APP_ID !== 0) {
    // Create an instance of the AlgorandEventListener class
    const listener = new AlgorandEventListener(ALGORAND_APP_ID);
    listener.startListening();
    console.log(`✅ Algorand Event Listener started for App ID: ${ALGORAND_APP_ID}`);
  } else {
    console.warn('⚠️ ALGORAND_APP_ID not set. Algorand Event Listener not started. Please deploy the Algorand contract first.');
  }
});