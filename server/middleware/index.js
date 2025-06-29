const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Security middleware
const securityMiddleware = [
  // Helmet for security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false
  }),
  
  // Compression
  compression(),
  
  // Data sanitization
  mongoSanitize(),
  
  // XSS protection middleware
  (req, res, next) => {
    if (req.body) {
      for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = xss(req.body[key]);
        }
      }
    }
    next();
  }
];

// Rate limiting
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limits
const rateLimits = {
  general: createRateLimit(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  cardCreation: createRateLimit(60 * 60 * 1000, 10), // 10 card creations per hour
  cardRedemption: createRateLimit(15 * 60 * 1000, 50), // 50 redemptions per 15 minutes
  auth: createRateLimit(15 * 60 * 1000, 5) // 5 auth attempts per 15 minutes
};

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify Supabase JWT token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token verification failed' });
  }
};

// Merchant authentication middleware
const authenticateMerchant = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is a verified merchant
    const { data: merchant, error } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', req.user.id)
      .eq('is_verified', true)
      .eq('is_active', true)
      .single();

    if (error || !merchant) {
      return res.status(403).json({ error: 'Merchant access required' });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Merchant verification failed' });
  }
};

// Input validation schemas
const validationSchemas = {
  createCard: [
    body('userId').isUUID().withMessage('Valid user ID required'),
    body('amount')
      .isFloat({ min: 1, max: 500 })
      .withMessage('Amount must be between $1 and $500'),
    body('currency')
      .optional()
      .isIn(['usd', 'aud', 'nzd', 'eur'])
      .withMessage('Invalid currency'),
    body('merchantId').isUUID().withMessage('Valid merchant ID required'),
    body('purpose')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Purpose must be under 200 characters')
  ],

  redeemCard: [
    body('merchantId').isUUID().withMessage('Valid merchant ID required'),
    body('securityCode')
      .optional()
      .isLength({ min: 4, max: 10 })
      .withMessage('Security code must be 4-10 characters')
  ],

  refundCard: [
    body('merchantId').isUUID().withMessage('Valid merchant ID required'),
    body('reason')
      .isLength({ min: 10, max: 500 })
      .withMessage('Refund reason must be 10-500 characters'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Refund amount must be positive')
  ],

  createMerchant: [
    body('businessName')
      .isLength({ min: 2, max: 255 })
      .withMessage('Business name must be 2-255 characters'),
    body('businessEmail')
      .isEmail()
      .withMessage('Valid business email required'),
    body('businessPhone')
      .optional()
      .matches(/^\+?[\d\s\-\(\)]+$/)
      .withMessage('Invalid phone number format'),
    body('contactPerson')
      .isLength({ min: 2, max: 255 })
      .withMessage('Contact person name required'),
    body('merchantType')
      .isIn(['agent', 'store', 'online'])
      .withMessage('Invalid merchant type')
  ]
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json({
      error: 'Payment processing error',
      details: err.message
    });
  }

  // Supabase errors
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json({
      error: 'Database error',
      details: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://your-bolt-app.netlify.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

module.exports = {
  securityMiddleware,
  rateLimits,
  authenticateToken,
  authenticateMerchant,
  validationSchemas,
  handleValidationErrors,
  errorHandler,
  requestLogger,
  corsOptions,
  supabase
};