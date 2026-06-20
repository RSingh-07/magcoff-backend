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
      email:  process.env.DEV_AUTH_USER_EMAIL || 'dev@example.com',
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

  // ── Debug decode (claims inspection) ────────────────────────────
  // This logs claims for debugging, NOT the token itself (security)
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (decoded && decoded.payload) {
      console.log('================ TOKEN CLAIMS ================');
      console.log('OID (User ID):',    decoded.payload.oid);
      console.log('SUB (Fallback ID):', decoded.payload.sub);
      console.log('EMAIL:',            decoded.payload.email);
      console.log('PREFERRED_USERNAME:', decoded.payload.preferred_username);
      console.log('IDP (Provider):',   decoded.payload.idp);
      console.log('AUD (Audience):',   decoded.payload.aud);
      console.log('ISS (Issuer):',     decoded.payload.iss);
      console.log('EXP:',              new Date(decoded.payload.exp * 1000));
      console.log('=============================================');
    }
  } catch (e) {
    console.error('Decode error:', e.message);
  }

  // ── Verify signature ────────────────────────────────────────────
  const verifyOptions = {
    algorithms: ['RS256'],
    issuer: process.env.AZURE_AD_B2C_ISSUER,
    audience: process.env.AZURE_AD_B2C_CLIENT_ID,
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

    // ──────────────────────────────────────────────────────────────
    // BUG FIX: Use oid/sub (stable user ID), NOT email, as primary key
    // 
    // When multiple auth providers are enabled (Google, Apple, Facebook
    // via Entra federation), the email format may vary, but oid/sub
    // remains stable across all providers for the same user.
    //
    // Example:
    //   Microsoft: oid = "12345678-1234-1234-1234-123456789012"
    //   Google (via Entra): oid = "12345678-1234-1234-1234-123456789012"
    //   Apple (via Entra): oid = "12345678-1234-1234-1234-123456789012"
    //   Email format: "user@microsoft.com" vs "user@gmail.com" (VARIES)
    //
    // Always query/store by oid/sub. Email is profile data only.
    // ──────────────────────────────────────────────────────────────

    // Extract stable user ID from token
    const userId = decoded.oid || decoded.sub;
    if (!userId) {
      console.error('❌ No oid/sub claim in token');
      return res.status(401).json({
        success: false,
        message: 'Invalid token: no user ID claim',
      });
    }

    // Attach user info to request
    // Use oid/sub as primary identifier
    req.user = {
      userId: userId,              // Stable ID for DB queries
      oid: userId,                 // Also store as oid for clarity
      email: decoded.email || decoded.preferred_username || null,
      name: decoded.name || null,
      provider: decoded.idp || 'entra',  // Which provider: 'google', 'apple', 'facebook', etc.
      role: 'customer',
      source: 'entra',
      aud: decoded.aud,            // For debugging
      iss: decoded.iss,            // For debugging
    };

    console.log(`✅ User authenticated: ${req.user.userId} (provider: ${req.user.provider})`);
    next();
  });
};

export default authenticateToken;