import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-twitter';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
  constructor(private configService: ConfigService) {
    super({
      consumerKey: configService.get<string>('TWITTER_CONSUMER_KEY') || '',
      consumerSecret:
        configService.get<string>('TWITTER_CONSUMER_SECRET') || '',
      callbackURL: configService.get<string>('TWITTER_CALLBACK_URL') || '',
      includeEmail: true,
    });
  }

  async validate(
    token: string,
    tokenSecret: string,
    profile: any,
    done: Function,
  ) {
    const { id, username, emails, photos } = profile;
    const user = {
      twitterId: id,
      username,
      email: emails?.[0]?.value || null,
      photo: photos?.[0]?.value || null,
      accessToken: token,
      refreshToken: tokenSecret,
    };
    done(null, user);
  }
}
