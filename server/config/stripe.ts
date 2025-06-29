import Stripe from "stripe";

// Define types for configuration
interface StripeCardExpiry {
  hours: number;
}

interface StripeFees {
  platformFeePercentage: number;
  stripeFeePercentage: number;
  stripeFeeFixed: number;
}

interface StripeDefaults {
  currency: string;
  cardExpiry: StripeCardExpiry;
  fees: StripeFees;
}

interface StripeAppInfo {
  name: string;
  version: string;
  url: string;
}

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  apiVersion: Stripe.LatestApiVersion | string;
  appInfo: StripeAppInfo;
  defaults: StripeDefaults;
}

// Bolt-compatible Stripe configuration
const stripeConfig: StripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  apiVersion: (process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion) || "2023-10-16",
  appInfo: {
    name: "Samoa Virtual Bankcard",
    version: "1.0.0",
    url: "https://github.com/yourusername/samoa-virtual-bankcard",
  },
  defaults: {
    currency: "usd",
    cardExpiry: {
      hours: 24,
    },
    fees: {
      platformFeePercentage: 2.5,
      stripeFeePercentage: 2.9,
      stripeFeeFixed: 0.3,
    },
  },
};

// Validate required environment variables
const requiredEnvVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required Stripe environment variables: ${missingVars.join(", ")}`
  );
}

// Initialize Stripe with configuration
const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion as Stripe.LatestApiVersion,
  appInfo: stripeConfig.appInfo,
});

// Stripe helper functions
const stripeHelpers = {
  async createVirtualPaymentMethod(cardData: {
    billingDetails?: Stripe.PaymentMethodCreateParams.BillingDetails;
    metadata?: Record<string, string>;
  } = {}) {
    try {
      const paymentMethod = await stripe.paymentMethods.create({
        type: "card",
        card: {
          number: "4242424242424242",
          exp_month: 12,
          exp_year: new Date().getFullYear() + 1,
          cvc: "123",
        },
        billing_details: cardData.billingDetails || {},
        metadata: {
          type: "virtual_oneuse",
          created_for: "samoa_bankcard",
          ...cardData.metadata,
        },
      });

      return paymentMethod;
    } catch (error: any) {
      throw new Error(`Failed to create virtual payment method: ${error.message}`);
    }
  },

  async createPaymentIntent(params: {
    amount: number;
    currency?: string;
    paymentMethodId: string;
    userId: string;
    merchantId: string;
    metadata?: Record<string, string>;
  }) {
    const {
      amount,
      currency = stripeConfig.defaults.currency,
      paymentMethodId,
      userId,
      merchantId,
      metadata = {},
    } = params;

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        payment_method: paymentMethodId,
        confirmation_method: "manual",
        confirm: false,
        capture_method: "manual",
        metadata: {
          userId,
          merchantId,
          cardType: "virtual_oneuse",
          platform: "samoa_bankcard",
          ...metadata,
        },
        description: `Samoa Virtual Card - ${amount} ${currency.toUpperCase()}`,
        statement_descriptor: "SAMOA VCARD",
        application_fee_amount: Math.round(
          amount * 100 * (stripeConfig.defaults.fees.platformFeePercentage / 100)
        ),
      });

      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Failed to create payment intent: ${error.message}`);
    }
  },

  async confirmPaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

      if (paymentIntent.status === "requires_capture") {
        return await stripe.paymentIntents.capture(paymentIntentId);
      }

      return paymentIntent;
    } catch (error: any) {
      throw new Error(`Failed to confirm payment intent: ${error.message}`);
    }
  },

  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: Stripe.RefundCreateParams.Reason;
    metadata?: Record<string, string>;
  }) {
    const {
      paymentIntentId,
      amount,
      reason = "requested_by_customer",
      metadata = {},
    } = params;

    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason,
        metadata: {
          platform: "samoa_bankcard",
          ...metadata,
        },
      });

      return refund;
    } catch (error: any) {
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  },

  verifyWebhookSignature(payload: Buffer | string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeConfig.webhookSecret
      );
      return event;
    } catch (error: any) {
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }
  },

  calculateFees(amount: number) {
    const platformFee =
      amount * (stripeConfig.defaults.fees.platformFeePercentage / 100);
    const stripeFee =
      amount * (stripeConfig.defaults.fees.stripeFeePercentage / 100) +
      stripeConfig.defaults.fees.stripeFeeFixed;
    const totalFees = platformFee + stripeFee;
    const netAmount = amount - totalFees;

    return {
      amount,
      platformFee: Math.round(platformFee * 100) / 100,
      stripeFee: Math.round(stripeFee * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
    };
  },

  async getPaymentMethod(paymentMethodId: string) {
    try {
      return await stripe.paymentMethods.retrieve(paymentMethodId);
    } catch (error: any) {
      throw new Error(`Failed to retrieve payment method: ${error.message}`);
    }
  },

  async listPaymentIntents(customerId: string, limit: number = 10) {
    try {
      return await stripe.paymentIntents.list({
        customer: customerId,
        limit,
      });
    } catch (error: any) {
      throw new Error(`Failed to list payment intents: ${error.message}`);
    }
  },
};

export { stripe, stripeConfig, stripeHelpers };
