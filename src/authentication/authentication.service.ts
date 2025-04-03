import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDTO } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDTO } from './dto/login.dto';
import { v4 as uuIdv4 } from 'uuid';
import { RefreshTokenDTO } from './dto/refresh-token.dto';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { ForgotPasswordDTO } from './dto/forgot-password.dto';
import { nanoid } from 'nanoid';
import { MailService } from './service/mail.service';
import { ResetPasswordDTO } from './dto/reset-password.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  saltRounds = process.env.SALT_ROUNDS ? +process.env.SALT_ROUNDS : 10;

  // Generate tokens
  async generateUserTokens(user) {
    const payload = { sub: user.id, role: user.role.name };

    // generate jwt token
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = uuIdv4();

    return {
      accessToken,
      refreshToken,
    };
  }

  // Handle the new user registration
  async register(registerDto: RegisterDTO) {
    const { firstName, lastName, email, password, roleId } = registerDto;

    // check if user exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // hash the password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Fetch the default "user" role
    const userRole = await this.prisma.roles.findUnique({
      where: { name: 'USER' },
    });

    if (!userRole) throw new Error('Default user role not found');

    // create new user
    const newUser = await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        roleId: userRole.id,
        profile_picture: '',
      },
      include: {
        role: true,
      },
      omit: {
        password: true,
      },
    });

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateUserTokens(newUser);

    return {
      newUser,
      accessToken,
      refreshToken,
    };
  }

  // Handle the user login
  async login(loginDto: LoginDTO) {
    const { email, password } = loginDto;

    // check if user exits
    const user = await this.prisma.users.findUnique({
      where: { email: email },
      include: { role: true }, // Include role for JWT payload
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateUserTokens(user);

    // Store refresh token in database
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    await this.prisma.refreshToken.upsert({
      where: { userId: user.id },
      update: { token: refreshToken, expiryDate },
      create: { userId: user.id, token: refreshToken, expiryDate },
    });

    // remove the password from the response
    const { password: _, ...result } = user;
    return {
      ...result,
      accessToken,
      refreshToken,
    };
  }

  // Login with 2FA
  async loginWith2FA(user: any) {
    try {
      const { accessToken, refreshToken } = await this.generateUserTokens(user);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          profile_picture: user.profile_picture,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Fail to login with 2FA',
        error.message,
      );
    }
  }

  // Handle facebook login user validation or creation
  async facebookAuth(userData: any) {
    const { email, firstName, lastName } = userData;
    console.log({ email, firstName, lastName });
  }

  // Handle google login user validation or creation
  async googleAuth(userData: any) {
    const { email, name, picture } = userData;

    const [firstName, lastName] = name.split(' ');

    // Check if user exists in the database
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { role: true },
    });
    if (user) {
      throw new ConflictException('User already exists');
    }

    const newUser = await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: '',
        profile_picture: picture,
      },
      omit: { password: true },
    });

    return newUser;
  }

  // Handle the refresh tokens
  async refreshTokens(data: RefreshTokenDTO) {
    // Fetch and validate refresh token
    const fetchRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        token: data.token,
        expiryDate: { gte: new Date() },
      },
    });

    if (!fetchRefreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Fetch user data
    const user = await this.prisma.users.findUnique({
      where: { id: fetchRefreshToken.userId },
      include: { role: true }, // Include role for JWT payload
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateUserTokens(user);

    // Update refresh token in database
    await this.prisma.refreshToken.update({
      where: { id: fetchRefreshToken.id },
      data: {
        token: refreshToken,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      },
    });

    return { accessToken, refreshToken };
  }

  // Handle change password
  async changePassword(userId: number, data: ChangePasswordDTO) {
    // find the user
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // compare the old password with the password in database
    const passwordMatch = await bcrypt.compare(data.oldPassword, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Wrong credentials');
    }

    // change user's password
    data.newPassword = await bcrypt.hash(data.newPassword, this.saltRounds);
    await this.prisma.users.update({
      where: { id: userId },
      data: { password: data.newPassword },
    });

    return {
      message: 'Password changed',
    };
  }

  // Handle forgot password
  async forgotPassword(data: ForgotPasswordDTO) {
    // check the email
    const user = await this.prisma.users.findUnique({
      where: { email: data.email },
    });
    if (user) {
      const expiryDate = new Date();
      expiryDate.setUTCHours(expiryDate.getUTCHours() + 1);

      // if user exists, generates password reset link
      const resetToken = nanoid(64);
      await this.prisma.resetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiryDate: expiryDate, // 1 hour
        },
      });

      // send the link to the user by email (using nodemailer)
      this.mailService.sendPasswordResetEmail(data.email, resetToken);
    }

    return {
      message: 'If user exists, they will receive an email',
    };
  }

  // Handle reset password
  async resetPassword(data: ResetPasswordDTO) {
    // fetch token from the database
    const token = await this.prisma.resetToken.findFirst({
      where: {
        token: data.resetToken,
        expiryDate: { gte: new Date() },
      },
    });

    if (!token) {
      throw new UnauthorizedException('Invalid link');
    }

    const user = await this.prisma.users.findUnique({
      where: { id: token.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    data.newPassword = await bcrypt.hash(data.newPassword, this.saltRounds);
    await this.prisma.users.update({
      where: { id: user.id },
      data: {
        password: data.newPassword,
      },
    });

    return {
      message: 'Password reset successfully.',
    };
  }
}
