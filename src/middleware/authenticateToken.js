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

  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'No token' });
  }

  const token = authHeader.split(' ')[1];

  // Decode without verification — safe for testing only
  const decoded = jwt.decode(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  console.log('TOKEN CLAIMS:', JSON.stringify(decoded));

  req.user = {
    userId: decoded.oid || decoded.sub,
    oid:    decoded.oid || decoded.sub,
    email:  decoded.email || decoded.preferred_username || null,
    name:   decoded.name  || null,
    role:   'customer',
    source: 'entra',
  };

  next();
};

export default authenticateToken;