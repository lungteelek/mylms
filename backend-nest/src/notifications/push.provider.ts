import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';

@Injectable()
export class PushProvider {
  private readonly logger = new Logger(PushProvider.name);
  private readonly projectId: string;
  private readonly serviceAccountJson: string;

  constructor(private readonly configService: ConfigService) {
    this.projectId = this.configService.get<string>('app.firebaseProjectId') || '';
    this.serviceAccountJson = this.configService.get<string>('app.firebaseServiceAccountJson') || '';
  }

  isEnabled() {
    return !!this.projectId && !!this.serviceAccountJson;
  }

  async sendToDevice(input: { token: string; title: string; body: string; data?: Record<string, string> }) {
    if (!this.isEnabled()) {
      this.logger.warn('Firebase is not configured; skipping push delivery');
      return { delivered: false, skipped: true };
    }

    const credentials = JSON.parse(this.serviceAccountJson);
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    const client = await auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    const accessToken = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse.token;

    if (!accessToken) {
      throw new Error('Unable to obtain Firebase access token');
    }

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token: input.token,
          notification: {
            title: input.title,
            body: input.body,
          },
          data: input.data,
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FCM send failed: ${response.status} ${text}`);
    }

    return { delivered: true, skipped: false };
  }
}
