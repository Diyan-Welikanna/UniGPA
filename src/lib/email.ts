export class EmailService {
  private static WEB3FORMS_URL = 'https://api.web3forms.com/submit';
  private static ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY;

  /**
   * Send verification code email via Web3Forms
   */
  static async sendVerificationCode(email: string, code: string, name: string): Promise<boolean> {
    try {
      const response = await fetch(this.WEB3FORMS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_key: this.ACCESS_KEY,
          subject: 'UniGPA - Verification Code',
          from_name: 'UniGPA',
          to: email,
          message: `
Hello ${name},

Your verification code is: ${code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
UniGPA Team
          `.trim(),
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error('Web3Forms returned non-JSON response (invalid API key or endpoint)');
        return false;
      }

      const result = await response.json();
      return result.success === true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      return false;
    }
  }

  /**
   * Generate a random 6-digit verification code
   */
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
