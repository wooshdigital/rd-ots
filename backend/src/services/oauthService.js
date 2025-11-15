import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

class OAuthService {
  constructor() {
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

      return {
        email: payload.email,
        full_name: payload.name,
        google_id: payload.sub,
        profile_picture: payload.picture,
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
