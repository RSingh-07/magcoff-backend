import jwt        from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

let _jwksClient = null;

function getJwksClient() {
  if (_jwksClient) return _jwksClient;
  const { AZURE_AD_B2C_JWKS_URI } = process.env;
  if (!AZURE_AD_B2C_JWKS_URI) {
    throw new Error('AZURE_AD_B2C_JWKS_URI is not set');
  }
  _jwksClient = jwksClient({
    jwksUri:               AZURE_AD_B2C_JWKS_URI,
    cache:                 true,
    cacheMaxEntries:       5,
    cacheMaxAge:           600_000,
    rateLimit:             true,
    jwksRequestsPerMinute: 10,
  });
  return _jwksClient;
}

function getSigningKey(header, callback) {
  try {
    const client = getJwksClient();
    client.getSigningKey(header.kid, (err, key) => {
      if (err) { callback(err); return; }
      callback(null, key.getPublicKey());
    });
  } catch (err) {
    callback(err);
  }
}

const authenticateToken = (req, res, next) => {
  // ── Dev bypass ────────────────────────────────────────────────────────────
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    req.user = {
      userId: process.env.DEV_AUTH_USER_ID,
      oid:    process.env.DEV_AUTH_USER_ID,
      phone:  process.env.DEV_AUTH_USER_PHONE,
      role:   'customer',
      source: 'dev_bypass',
    };
    return next();
  }

  // ── Extract token ─────────────────────────────────────────────────────────
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing or malformed',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Bearer token is empty',
    });
  }

  const { AZURE_AD_B2C_CLIENT_ID, AZURE_AD_B2C_ISSUER } = process.env;

  // ── Verify token ──────────────────────────────────────────────────────────
  const verifyOptions = {
    algorithms: ['RS256'],
    audience:   AZURE_AD_B2C_CLIENT_ID,
    issuer:     AZURE_AD_B2C_ISSUER,
  };

  jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
    if (err) {
      console.error('❌ Token error:', err.name, err.message);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please sign in again.',
          code:    'TOKEN_EXPIRED',
        });
      }

      // Log the full error for debugging
      return res.status(401).json({
        success: false,
        message: `Token verification failed: ${err.message}`,
        code:    'TOKEN_INVALID',
      });
    }

    // ── Attach identity ───────────────────────────────────────────────────
    req.user = {
      userId: decoded.oid || decoded.sub,
      oid:    decoded.oid || decoded.sub,
      phone:  decoded.phone_number || null,
      email:  decoded.email || decoded.preferred_username || null,
      name:   decoded.name  || null,
      role:   'customer',
      source: 'entra',
    };

    next();
  });
};

export default authenticateToken;