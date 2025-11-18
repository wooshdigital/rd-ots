import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import cetAccessService from './cetAccessService.js';

class OAuthService {
  constructor() {
    console.log('[OAuth Service] Initializing with redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.allowedDomains = ['rooche.digital', 'rooche.net'];
  }

  /**
   * Generate authorization URL for Google OAuth
   */
  getAuthorizationUrl() {
    const authUrl = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'select_account',
    });
    return authUrl;
  }

  /**
   * Verify Google OAuth code and get user info
   */
  async verifyGoogleToken(code) {
    try {
      const { tokens } = await this.client.getToken(code);
      this.client.setCredentials(tokens);

      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      // Get additional user info from Google's UserInfo endpoint (includes picture)
      let profilePicture = payload.picture; // Try from ID token first

      if (!profilePicture && tokens.access_token) {
        try {
          // Fetch from UserInfo endpoint
          const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          });
          const userInfo = await response.json();
          profilePicture = userInfo.picture;
          console.log('[OAuth Service] Got profile picture from UserInfo API:', profilePicture);
        } catch (err) {
          console.error('[OAuth Service] Failed to fetch UserInfo:', err.message);
        }
      }

      return {
        email: payload.email,
        full_name: payload.name,
        google_id: payload.sub,
        profile_picture: profilePicture,
        email_verified: payload.email_verified,
      };
    } catch (error) {
      throw new Error(`OAuth verification failed: ${error.message}`);
    }
  }

  /**
   * Check if email domain is allowed
   */
  checkDomainAccess(email) {
    const domain = email.split('@')[1];
    return this.allowedDomains.includes(domain);
  }

  /**
   * Check if user has access via CET
   */
  async checkCetAccess(email) {
    return await cetAccessService.checkUserAccess(email);
  }

  /**
   * Get user's CET access information including roles
   */
  async getCetUserInfo(email) {
    return await cetAccessService.getUserAccessInfo(email);
  }

  /**
   * Generate secure session token
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate session expiration (5 days from now)
   */
  getSessionExpiration() {
    const expirationDays = parseInt(process.env.SESSION_EXPIRATION_DAYS || '5');
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + expirationDays);
    return expiration;
  }
}

export default new OAuthService();
