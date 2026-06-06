import jwt from 'jsonwebtoken';

function parseConnectionString(connStr) {
  return connStr.split(';').reduce((acc, part) => {
    const match = part.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1]] = match[2];
    return acc;
  }, {});
}

export function generateSignalRCredentials(userId) {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) throw new Error('SIGNALR_CONNECTION_STRING is not set');

  const { Endpoint, AccessKey } = parseConnectionString(connStr);
  if (!Endpoint || !AccessKey) throw new Error('Invalid SignalR connection string');

  const hubName = process.env.SIGNALR_HUB_NAME || 'cart';
  const clientUrl = `${Endpoint}/client/?hub=${hubName}`;

  const token = jwt.sign(
    { nameid: String(userId) },   // ties SignalR connection to your Azure OID
    AccessKey,
    {
      audience: clientUrl,
      expiresIn: '1h',
      algorithm: 'HS256',
    }
  );

  return { url: clientUrl, accessToken: token };
}