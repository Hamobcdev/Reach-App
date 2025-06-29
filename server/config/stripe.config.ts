import Stripe from "stripe";

export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY || "",
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  apiVersion: process.env.STRIPE_API_VERSION || "2023-10-16",

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

// Check required environment variables
const requiredEnvVars = [
  "VITE_STRIPE_SECRET_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
  "VITE_STRIPE_WEBHOOK_SECRET",
];

const missingVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing Stripe environment variables: ${missingVars.join(", ")}`
  );
}

export const stripe = new Stripe(stripeConfig.secretKey as string, {
  apiVersion: stripeConfig.apiVersion as Stripe.LatestApiVersion,
  appInfo: stripeConfig.appInfo,
  typescript: true,
});

export const stripeHelpers = {
  async createVirtualPaymentMethod(
    cardData: {
      billingDetails?: Stripe.PaymentMethodCreateParams.BillingDetails;
      metadata?: Record<string, string>;
    } = {}
  ) {
    return await stripe.paymentMethods.create({
      type: "card",
      card: {
        number: "4242424242424242",
        exp_month: 12,
        exp_year: new Date().getFullYear() + 1,
        cvc: "123",
      },
      billing_details: cardData.billingDetails,
      metadata: {
        type: "virtual_oneuse",
        created_for: "samoa_bankcard",
        ...(cardData.metadata || {}),
      },
    });
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

    return await stripe.paymentIntents.create({
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
  },

  async confirmPaymentIntent(paymentIntentId: string) {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    if (paymentIntent.status === "requires_capture") {
      return await stripe.paymentIntents.capture(paymentIntentId);
    }

    return paymentIntent;
  },

  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: Stripe.RefundCreateParams.Reason;
    metadata?: Record<string, string>;
  }) {
    return await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount ? Math.round(params.amount * 100) : undefined,
      reason: params.reason || "requested_by_customer",
      metadata: {
        platform: "samoa_bankcard",
        ...(params.metadata || {}),
      },
    });
  },

  verifyWebhookSignature(payload: string | Buffer, signature: string) {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        stripeConfig.webhookSecret as string
      );
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
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
    return await stripe.paymentMethods.retrieve(paymentMethodId);
  },

  async listPaymentIntents(customerId: string, limit = 10) {
    return await stripe.paymentIntents.list({
      customer: customerId,
      limit,
    });
  },
};
