import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_CLIENT_ID') || '',
      clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || '',
      scope: ['public_profile', 'email'],
      profileFields: ['id', 'email', 'first_name', 'last_name'], // Fixed field names
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    try {
      const email = profile.emails?.[0]?.value || null;
      if (!email) {
        throw new Error('No email found in Facebook profile');
      }

      const firstName =
        profile.name?.givenName || profile._json.first_name || '';
      const lastName =
        profile.name?.familyName || profile._json.last_name || '';

      const user = { email, firstName, lastName };

      const payload = { user, accessToken };

      console.log(payload);

      done(null, payload);
    } catch (error) {
      done(error, null);
    }
  }
}
