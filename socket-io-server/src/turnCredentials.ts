import crypto from 'crypto';

export interface TurnCredentials {
  username: string;
  credential: string;
  urls: string[];
}

export function generateTurnCredentials(
  turnSecret: string,
  turnServerUrl: string,
  ttl: number = 86400
): TurnCredentials {
  const unixTimeStamp = Math.floor(Date.now() / 1000) + ttl;
  const username = unixTimeStamp.toString();
  
  const hmac = crypto.createHmac('sha1', turnSecret);
  hmac.update(username);
  const credential = hmac.digest('base64');
  
  // Remove port if already included in turnServerUrl
  const serverHost = turnServerUrl.includes(':') ? turnServerUrl : `${turnServerUrl}:3478`;
  
  const urls = [
    `stun:${serverHost}`,
    `turn:${serverHost}`,
    `turn:${serverHost}?transport=tcp`,
  ];
  
  return {
    username,
    credential,
    urls,
  };
}