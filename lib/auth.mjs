import { createRemoteJWKSet, jwtVerify } from 'jose';
import { HttpError } from './content.mjs';

const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
export function authorizeClaims(claims, env = process.env) {
  const emails = (env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (new Set(emails).size !== 2 || emails.some(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) {
    throw new HttpError(503, 'Stel precies twee verschillende beheer-e-mailadressen in bij ADMIN_EMAILS.');
  }
  if (claims.email_verified !== true || claims.firebase?.sign_in_provider !== 'google.com' ||
      typeof claims.email !== 'string' || !emails.includes(claims.email.toLowerCase())) {
    throw new HttpError(403, 'Dit Google-account heeft geen toegang tot het beheer.');
  }
  return claims.email;
}
export async function authenticate(request, env = process.env) {
  if (!env.FIREBASE_PROJECT_ID) throw new HttpError(503, 'Firebase is nog niet ingesteld. Bekijk SETUP.md.');
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new HttpError(401, 'Log eerst in met Google.');
  let claims;
  try {
    ({ payload: claims } = await jwtVerify(token, keys, {
      algorithms: ['RS256'], audience: env.FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
      requiredClaims: ['exp', 'iat', 'sub', 'auth_time']
    }));
    const now = Math.floor(Date.now() / 1000);
    if (!claims.sub || claims.sub.length > 128 || claims.iat > now || claims.auth_time > now) throw new Error('Invalid claims');
  } catch { throw new HttpError(401, 'Je sessie is verlopen of ongeldig. Log opnieuw in.'); }
  return authorizeClaims(claims, env);
}
