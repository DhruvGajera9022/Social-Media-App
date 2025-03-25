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
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails } = profile;

    // Ensure emails exist before accessing them
    const email = emails && emails.length > 0 ? emails[0].value : null;
    if (!email) {
      throw new Error('No email found in Facebook profile');
    }

    const user = {
      email,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
    };

    const payload = {
      user,
      accessToken,
    };

    done(null, payload);
  }
}
