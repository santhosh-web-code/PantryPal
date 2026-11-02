import { randomBytes, timingSafeEqual } from 'node:crypto';
import Pantry from '../models/Pantry.js';
import User from '../models/User.js';
import { HttpError } from '../middleware/errors.js';
import { normalizePortal, signUser } from '../middleware/auth.js';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  GOOGLE_STATE_COOKIE_NAME,
  GOOGLE_STATE_COOKIE_PATH,
  googleStateCookieOptions,
  readCookie
} from '../utils/authCookie.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedRoles = new Set(['owner', 'buyer', 'member']);
const expectedOAuthErrors = new Set([
  'GOOGLE_ACCOUNT_LINK_REQUIRED',
  'GOOGLE_ACCOUNT_INACTIVE',
  'GOOGLE_EMAIL_CONFLICT',
  'GOOGLE_EMAIL_UNVERIFIED',
  'GOOGLE_IDENTITY_INVALID'
]);

function frontendCallbackUrl(errorCode) {
  const configuredUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  let url;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new HttpError(503, 'Frontend URL is not configured on the server', 'CLIENT_URL_NOT_CONFIGURED');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')) {
    throw new HttpError(503, 'Frontend URL is not configured on the server', 'CLIENT_URL_NOT_CONFIGURED');
  }
  url.pathname = '/auth/callback';
  url.search = '';
  url.hash = '';
  if (errorCode) url.searchParams.set('error', errorCode);
  return url.toString();
}

function clearStateCookie(res) {
  res.clearCookie(GOOGLE_STATE_COOKIE_NAME, {
    ...googleStateCookieOptions(false),
    path: GOOGLE_STATE_COOKIE_PATH
  });
}

function validState(received, expected) {
  if (typeof received !== 'string' || typeof expected !== 'string') return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function safeProfileImage(value) {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function googleDisplayName(identity) {
  const fullName = typeof identity.name === 'string' ? identity.name.trim() : '';
  if (fullName.length >= 2) return fullName;

  const givenName = typeof identity.given_name === 'string' ? identity.given_name.trim() : '';
  const familyName = typeof identity.family_name === 'string' ? identity.family_name.trim() : '';
  const combinedName = [givenName, familyName].filter(Boolean).join(' ');
  if (combinedName.length >= 2) return combinedName;

  const emailName = identity.email.split('@')[0].replace(/[._+-]+/g, ' ').trim();
  if (emailName.length >= 2) return emailName;
  throw new HttpError(401, 'Google did not provide a valid profile name', 'GOOGLE_IDENTITY_INVALID');
}

function validateIdentity(identity) {
  if (identity?.email_verified !== true) {
    throw new HttpError(401, 'Google must verify the email address before signing in', 'GOOGLE_EMAIL_UNVERIFIED');
  }
  if (typeof identity.sub !== 'string' || !identity.sub || typeof identity.email !== 'string' || !emailPattern.test(identity.email)) {
    throw new HttpError(401, 'Google did not provide a valid verified identity', 'GOOGLE_IDENTITY_INVALID');
  }
  googleDisplayName(identity);
}

function requireRequestedRole(user) {
  if (!user.active) {
    throw new HttpError(403, 'This PantryPal account is unavailable', 'GOOGLE_ACCOUNT_INACTIVE');
  }
}

async function findOrCreateGoogleUser(identity, portal) {
  validateIdentity(identity);
  const displayName = googleDisplayName(identity);
  const email = identity.email.trim().toLowerCase();
  const profileImage = safeProfileImage(identity.picture);
  let user = await User.findOne({ googleId: identity.sub }).select('+googleId');

  if (user) {
    requireRequestedRole(user);
    const conflictingEmail = await User.exists({ email, _id: { $ne: user._id } });
    if (conflictingEmail) {
      throw new HttpError(409, 'The verified Google email is already used by another PantryPal account', 'GOOGLE_EMAIL_CONFLICT');
    }
    user.name = displayName;
    user.email = email;
    if (profileImage) user.profileImage = profileImage;
    await user.save();
    return user;
  }

  const existingEmail = await User.findOne({ email }).select('+googleId');
  if (existingEmail) {
    throw new HttpError(409, 'This email already has a PantryPal account. Sign in with that account before linking Google.', 'GOOGLE_ACCOUNT_LINK_REQUIRED');
  }

  try {
    user = await User.create({
      name: displayName,
      email,
      googleId: identity.sub,
      profileImage,
      role: portal === 'owner' ? 'owner' : 'buyer'
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const linkedUser = await User.findOne({ googleId: identity.sub }).select('+googleId');
    if (linkedUser) {
      requireRequestedRole(linkedUser);
      return linkedUser;
    }
    throw new HttpError(409, 'This email already has a PantryPal account. Sign in with that account before linking Google.', 'GOOGLE_ACCOUNT_LINK_REQUIRED');
  }

  if (portal === 'owner') {
    await Pantry.create({ name: `${user.name}'s Pantry`, ownerId: user._id, memberIds: [] });
  }
  return user;
}

function callbackError(error) {
  if (error?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED' || error?.code === 'CLIENT_URL_NOT_CONFIGURED') return 'configuration';
  if (error?.code === 'GOOGLE_ACCOUNT_LINK_REQUIRED' || error?.code === 'GOOGLE_EMAIL_CONFLICT') return 'account_link_required';
  if (error?.code === 'GOOGLE_ACCOUNT_INACTIVE') return 'account_unavailable';
  if (error?.code === 'GOOGLE_EMAIL_UNVERIFIED') return 'email_unverified';
  if (error?.code === 'GOOGLE_IDENTITY_INVALID') return 'identity_invalid';
  return 'oauth_failed';
}

export function createGoogleAuthHandlers(googleOAuth) {
  return {
    portal(_req, res) {
      const url = new URL(frontendCallbackUrl());
      url.pathname = '/login';
      return res.redirect(302, url.toString());
    },

    async initiate(role, _req, res) {
      if (!allowedRoles.has(role)) throw new HttpError(404, 'Route not found', 'NOT_FOUND');

      try {
        const state = randomBytes(32).toString('base64url');
        const nonce = randomBytes(32).toString('base64url');
        const { codeVerifier, codeChallenge } = await googleOAuth.generateCodeVerifier();
        const authorizationUrl = await googleOAuth.createAuthorizationUrl({ state, codeChallenge, nonce });

        res.cookie(GOOGLE_STATE_COOKIE_NAME, JSON.stringify({ state, codeVerifier, nonce, role }), googleStateCookieOptions());
        res.redirect(302, authorizationUrl);
      } catch (error) {
        if (error?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED' || error?.code === 'CLIENT_URL_NOT_CONFIGURED') {
          return res.redirect(302, frontendCallbackUrl(callbackError(error)));
        }
        throw error;
      }
    },

    async callback(req, res) {
      let savedState;
      try {
        const rawState = readCookie(req, GOOGLE_STATE_COOKIE_NAME);
        savedState = rawState ? JSON.parse(rawState) : null;
      } catch {
        savedState = null;
      }

      clearStateCookie(res);
      if (!savedState || !validState(req.query.state, savedState.state) ||
          !allowedRoles.has(savedState.role) || typeof savedState.codeVerifier !== 'string' ||
          typeof savedState.nonce !== 'string') {
        return res.redirect(302, frontendCallbackUrl('invalid_state'));
      }

      if (req.query.error) {
        return res.redirect(302, frontendCallbackUrl(req.query.error === 'access_denied' ? 'cancelled' : 'oauth_failed'));
      }
      if (typeof req.query.code !== 'string' || !req.query.code) {
        return res.redirect(302, frontendCallbackUrl('oauth_failed'));
      }

      try {
        const identity = await googleOAuth.verifyAuthorizationCode({
          code: req.query.code,
          codeVerifier: savedState.codeVerifier
        });
        if (!validState(identity?.nonce, savedState.nonce)) {
          throw new HttpError(401, 'Google identity token could not be verified', 'GOOGLE_IDENTITY_INVALID');
        }
        const portal = normalizePortal(savedState.role);
        const user = await findOrCreateGoogleUser(identity, portal);
        res.cookie(AUTH_COOKIE_NAME, signUser(user, portal), authCookieOptions());
        return res.redirect(302, frontendCallbackUrl());
      } catch (error) {
        if (!expectedOAuthErrors.has(error?.code) &&
            !['GOOGLE_OAUTH_NOT_CONFIGURED', 'CLIENT_URL_NOT_CONFIGURED'].includes(error?.code)) {
          console.error(`Google OAuth callback failed (${error?.code || error?.name || 'unknown error'})`);
        }
        return res.redirect(302, frontendCallbackUrl(callbackError(error)));
      }
    }
  };
}
