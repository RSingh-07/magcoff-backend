import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

let _jwksClient = null;

function getJwksClient() {
  if (_jwksClient) return _jwksClient;

  const jwksUri = process.env.AZURE_AD_B2C_JWKS_URI;
  if (!jwksUri) throw new Error('AZURE_AD_B2C_JWKS_URI is not set');

  _jwksClient = jwksClient({
    jwksUri,                        // ← reads from .env now
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  return _jwksClient;
}

function getSigningKey(header, callback) {
  try {
    console.log('🔑 TOKEN KID:', header.kid);
    getJwksClient().getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('❌ JWKS ERROR:', err);
        return callback(err);
      }
      console.log('✅ PUBLIC KEY FOUND');
      callback(null, key.getPublicKey());
    });
  } catch (err) {
    console.error('❌ SIGNING KEY ERROR:', err);
    callback(err);
  }
}

const authenticateToken = (req, res, next) => {
  // ── Dev bypass ──────────────────────────────────────────────────
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

  // ── Extract token ───────────────────────────────────────────────
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authorization header missing or malformed',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Bearer token is empty' });
  }

  // ── Debug decode ────────────────────────────────────────────────
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('================ TOKEN DEBUG ================');
    console.log('HEADER:', decoded?.header);
    console.log('AUD:',    decoded?.payload?.aud);
    console.log('ISS:',    decoded?.payload?.iss);
    console.log('OID:',    decoded?.payload?.oid);
    console.log('SCP:',    decoded?.payload?.scp);
    console.log('=============================================');
  } catch (e) {
    console.error('Decode error:', e);
  }

  // ── Verify ──────────────────────────────────────────────────────
  const verifyOptions = {
    algorithms: ['RS256'],
    issuer: process.env.AZURE_AD_B2C_ISSUER,   // ← reads from .env
    audience: `api://${process.env.AZURE_AD_B2C_CLIENT_ID}`,
    ignoreExpiration: false,
  };

  jwt.verify(token, getSigningKey, verifyOptions, (err, decoded) => {
    if (err) {
      console.error('❌ Token error:', err.name, err.message);

      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please sign in again.',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({
        success: false,
        message: `Token verification failed: ${err.message}`,
        code: 'TOKEN_INVALID',
      });
    }

    req.user = {
      userId: decoded.oid || decoded.sub,
      oid:    decoded.oid || decoded.sub,
      email:  decoded.email || decoded.preferred_username || null,
      name:   decoded.name  || null,
      role:   'customer',
      source: 'entra',
    };

    next();
  });
};

export default authenticateToken;