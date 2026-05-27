/**
 * authenticateToken.js
 *
 * Azure AD B2C JWT validation middleware.
 *
 * Production mode:
 *   - Fetches B2C public signing keys from JWKS URI
 *   - Validates token signature, issuer, audience, expiry, and policy
 *   - Attaches verified user identity to req.user
 *
 * Development bypass mode (DEV_AUTH_BYPASS=true):
 *   - Skips all token validation
 *   - Injects hardcoded user from .env into req.user
 *   - Allows existing Flutter app to keep working before B2C is set up
 *   - NEVER active when NODE_ENV=production
 */

import jwt        from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// ── Lazy-initialised JWKS client (created once, reused across requests) ───────
let _jwksClient = null;

function getJwksClient() {
  if (_jwksClient) return _jwksClient;

  const { AZURE_AD_B2C_JWKS_URI } = process.env;

  if (!AZURE_AD_B2C_JWKS_URI) {
    throw new Error('AZURE_AD_B2C_JWKS_URI is not set in environment variables');
  }

  _jwksClient = jwksClient({
    jwksUri:             AZURE_AD_B2C_JWKS_URI,
    cache:               true,       // cache signing keys in memory
    cacheMaxEntries:     5,
    cacheMaxAge:         600_000,    // 10 minutes
    rateLimit:           true,       // prevent JWKS endpoint abuse
    jwksRequestsPerMinute: 10,
  });

  return _jwksClient;
}

// ── Key retrieval callback for jsonwebtoken ───────────────────────────────────
function getSigningKey(header, callback) {
  try {
    const client = getJwksClient();
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  } catch (err) {
    callback(err);
  }
}

// ── Main middleware ───────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  // ── Dev bypass — NEVER runs in production ──────────────────────────────────
  const isDevBypass =
    process.env.DEV_AUTH_BYPASS === 'true' &&
    process.env.NODE_ENV !== 'production';

  if (isDevBypass) {
    req.user = {
      userId: process.env.DEV_AUTH_USER_ID,
      phone:  process.env.DEV_AUTH_USER_PHONE,
      role:   'customer',
      source: 'dev_bypass',
    };
    return next();
  }

  // ── Production: extract Bearer token ──────────────────────────────────────
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing or malformed. Expected: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bearer token is empty',
    });
  }

  // ── Validate required env vars before attempting verification ─────────────
  const {
    AZURE_AD_B2C_TENANT_NAME,
    AZURE_AD_B2C_CLIENT_ID,
    AZURE_AD_B2C_POLICY,
    AZURE_AD_B2C_ISSUER,
  } = process.env;

  if (
    !AZURE_AD_B2C_TENANT_NAME ||
    !AZURE_AD_B2C_CLIENT_ID   ||
    !AZURE_AD_B2C_POLICY      ||
    !AZURE_AD_B2C_ISSUER
  ) {
    console.error('❌ Azure AD B2C environment variables are not configured');
    return res.status(500).json({
      success: false,
      message: 'Authentication service is not configured',
    });
  }

  // ── Verify token against B2C JWKS ─────────────────────────────────────────
  const verifyOptions = {
    algorithms: ['RS256'],        // B2C always signs with RS256
    audience:   AZURE_AD_B2C_CLIENT_ID,
    issuer:     AZURE_AD_B2C_ISSUER,
  };

  jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
    if (err) {
      // Distinguish between expired and invalid for better client error messages
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please sign in again.',
          code:    'TOKEN_EXPIRED',
        });
      }

      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.',
          code:    'TOKEN_INVALID',
        });
      }

      console.error('❌ Token verification error:', err.message);
      return res.status(401).json({
        success: false,
        message: 'Token verification failed.',
        code:    'TOKEN_VERIFICATION_FAILED',
      });
    }

    // ── Validate B2C policy claim ──────────────────────────────────────────
    // B2C tokens contain 'tfp' (trust framework policy) or 'acr' claim
    const tokenPolicy = decoded.tfp || decoded.acr;

    if (
      tokenPolicy &&
      tokenPolicy.toLowerCase() !== AZURE_AD_B2C_POLICY.toLowerCase()
    ) {
      return res.status(401).json({
        success: false,
        message: 'Token was issued by an unexpected policy.',
        code:    'POLICY_MISMATCH',
      });
    }

    // ── Attach verified identity to request ───────────────────────────────
    // B2C stores the MongoDB ObjectId in the 'oid' or custom 'extension_userId'
    // claim depending on how you configure the user flow.
    // We use 'extension_mongoUserId' as the custom claim name (configure in B2C).
    // Fallback to 'oid' (B2C object ID) if custom claim not present.
    req.user = {
      userId: decoded.extension_mongoUserId || decoded.oid,
      phone:  decoded.phone_number          || decoded.extension_phone || null,
      email:  decoded.email                 || decoded.emails?.[0]     || null,
      name:   decoded.name                  || null,
      role:   decoded.extension_role        || 'customer',
      b2cOid: decoded.oid,
      source: 'azure_b2c',
    };

    next();
  });
};

export default authenticateToken;