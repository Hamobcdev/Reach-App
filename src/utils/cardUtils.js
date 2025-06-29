// src/utils/cardUtils.js
// Generate a random card number in the format XXXX-XXXX-XXXX-XXXX
// src/utils/cardUtils.js
export function generateCardNumber() {
  return (
    "4532" +
    Math.floor(Math.random() * 1000000000000)
      .toString()
      .padStart(12, "0")
  );
}

export function generateCVV() {
  return Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
}

export function generateExpiryDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 3);
  return `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
}

// Format a card number for display (mask all but last 4 digits)
export const formatCardNumber = (cardNumber, masked = false) => {
  if (masked) {
    return `****-****-****-${cardNumber.slice(-4)}`;
  }
  return cardNumber;
};

// Calculate time remaining until expiry in minutes and seconds
export const getTimeRemaining = (createdAt) => {
  const now = new Date();
  const expiryTime = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
  const timeDiff = expiryTime.getTime() - now.getTime();
  if (timeDiff <= 0) return null;
  const minutes = Math.floor(timeDiff / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
  return { minutes, seconds };
};

// Validate card data
export const validateCardData = (cardData) => {
  const errors = {};
  if (!cardData.amount || cardData.amount < 1) {
    errors.amount = "Amount must be at least $1";
  }
  if (!cardData.customerEmail || !isValidEmail(cardData.customerEmail)) {
    errors.email = "Valid email is required";
  }
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Email validation helper
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format currency
export const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

// Card status helpers
export const getCardStatus = (createdAt) => {
  const timeRemaining = getTimeRemaining(new Date(createdAt));
  if (!timeRemaining) return "expired";
  if (timeRemaining.minutes < 60) return "expiring";
  return "active";
};

// Test card numbers for different scenarios
export const TEST_CARDS = {
  SUCCESS: "4242424242424242",
  DECLINED: "4000000000000002",
  INSUFFICIENT_FUNDS: "4000000000009995",
  EXPIRED: "4000000000000069",
  PROCESSING_ERROR: "4000000000000119",
  AUTHENTICATION_REQUIRED: "4000002500003155",
};

// Get test card description
export const getTestCardDescription = (cardNumber) => {
  switch (cardNumber) {
    case TEST_CARDS.SUCCESS:
      return "This card will always succeed";
    case TEST_CARDS.DECLINED:
      return "This card will be declined";
    case TEST_CARDS.INSUFFICIENT_FUNDS:
      return "This card will be declined for insufficient funds";
    case TEST_CARDS.EXPIRED:
      return "This card will be declined as expired";
    case TEST_CARDS.PROCESSING_ERROR:
      return "This card will fail with a processing error";
    case TEST_CARDS.AUTHENTICATION_REQUIRED:
      return "This card will require authentication";
    default:
      return "Unknown test card";
  }
};
