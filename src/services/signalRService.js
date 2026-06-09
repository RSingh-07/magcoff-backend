// src/services/signalRService.js

import jwt from 'jsonwebtoken';

function parseConnectionString(connStr) {
  return connStr.split(';').reduce((acc, part) => {
    const match = part.match(/^([^=]+)=(.*)$/);
    if (match) acc[match[1]] = match[2];
    return acc;
  }, {});
}

function getSignalRConfig() {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) throw new Error('SIGNALR_CONNECTION_STRING is not set');

  const { Endpoint, AccessKey } = parseConnectionString(connStr);
  if (!Endpoint || !AccessKey) throw new Error('Invalid SignalR connection string');

  const hubName = process.env.SIGNALR_HUB_NAME || 'cart';
  return { Endpoint: Endpoint.replace(/\/$/, ''), AccessKey, hubName };
}

function generateServiceToken(audience, accessKey) {
  return jwt.sign({}, accessKey, {
    audience,
    expiresIn: '1h',
    algorithm: 'HS256',
  });
}

// ── Used by negotiate controller ──────────────────────────────────────────────

export function generateSignalRCredentials(userId) {
  const { Endpoint, AccessKey, hubName } = getSignalRConfig();

  const clientUrl = `${Endpoint}/client/?hub=${hubName}`;

  const token = jwt.sign(
    { nameid: String(userId) },
    AccessKey,
    { audience: clientUrl, expiresIn: '1h', algorithm: 'HS256' }
  );

  return { url: clientUrl, accessToken: token };
}

// ── Used by linkCart controller ───────────────────────────────────────────────

export async function addUserToGroup(connectionId, groupName) {
  const { Endpoint, AccessKey, hubName } = getSignalRConfig();

  const url = `${Endpoint}/api/v1/hubs/${hubName}/groups/${groupName}/connections/${connectionId}`;
  const token = generateServiceToken(url, AccessKey);

  const response = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`addUserToGroup failed (${response.status}): ${body}`);
  }
}

// ── Used by Jetson hardware endpoint to push updates to Flutter ───────────────

export async function broadcastCartUpdate(groupName, cartData) {
  const { Endpoint, AccessKey, hubName } = getSignalRConfig();

  const url = `${Endpoint}/api/v1/hubs/${hubName}/groups/${groupName}`;
  const token = generateServiceToken(url, AccessKey);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      target: 'CartUpdated',
      arguments: [cartData],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`broadcastCartUpdate failed (${response.status}): ${body}`);
  }
}