import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

let _jwksClient = null;

function getJwksClient() {
  if (_jwksClient) return _jwksClient;

  const { AZURE_AD_B2C_JWKS_URI } = process.env;

  if (!AZURE_AD_B2C_JWKS_URI) {
    throw new Error('AZURE_AD_B2C_JWKS_URI is not set');
  }

  _jwksClient = jwksClient({
    jwksUri: AZURE_AD_B2C_JWKS_URI,
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

    const client = getJwksClient();

    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        console.error('❌ JWKS ERROR:', err);
        callback(err);
        return;
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
  if (process.env.DEV_AUTH_BYPASS === 'true') {
    req.user = {
      userId: process.env.DEV_AUTH_USER_ID,
      oid: process.env.DEV_AUTH_USER_ID,
      phone: process.env.DEV_AUTH_USER_PHONE,
      role: 'customer',
      source: 'dev_bypass',
    };

    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

  try {
    const decodedComplete = jwt.decode(token, { complete: true });
    const decodedPayload = jwt.decode(token);

    console.log('================ TOKEN DEBUG ================');
    console.log('HEADER:', decodedComplete?.header);
    console.log('AUD:', decodedPayload?.aud);
    console.log('ISS:', decodedPayload?.iss);
    console.log('APPID:', decodedPayload?.appid);
    console.log('OID:', decodedPayload?.oid);
    console.log('SCP:', decodedPayload?.scp);
    console.log('JWKS URI:', process.env.AZURE_AD_B2C_JWKS_URI);
    console.log('ISSUER:', process.env.AZURE_AD_B2C_ISSUER);
    console.log('============================================');
  } catch (e) {
    console.error('Decode error:', e);
  }

  const verifyOptions = {
    algorithms: ['RS256'],
    issuer: process.env.AZURE_AD_B2C_ISSUER,
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
      oid: decoded.oid || decoded.sub,
      email: decoded.email || decoded.preferred_username || null,
      name: decoded.name || null,
      role: 'customer',
      source: 'entra',
    };

    next();
  });
};

export default authenticateToken;