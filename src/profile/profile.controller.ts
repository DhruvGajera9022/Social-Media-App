import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from 'src/authentication/guard/jwt-auth.guard';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Get profile
  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req) {
    return this.profileService.getProfile(+req.user.userId);
  }
}
