import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDTO } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDTO } from './dto/login.dto';
import { v4 as uuIdv4 } from 'uuid';
import { RefreshTokenDTO } from './dto/refresh-token.dto';

@Injectable()
export class AuthenticationService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Handle the new user registration
  async register(registerDto: RegisterDTO) {
    const { firstName, lastName, email, password, role } = registerDto;

    // check if user exists
    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // hash the password
    const saltRounds = process.env.SALT_ROUNDS ? +process.env.SALT_ROUNDS : 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // create new user
    const newUser = await this.prisma.users.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role,
        profile_picture: '',
      },
    });

    // remove the password from the response
    const { password: _, ...result } = newUser;
    return result;
  }

  // Generate tokens
  async generateUserTokens(userId: number) {
    // generate jwt token
    const accessToken = this.jwtService.sign({ userId });
    const refreshToken = uuIdv4();

    return {
      accessToken,
      refreshToken,
    };
  }

  // Handle the user login
  async login(loginDto: LoginDTO) {
    const { email, password } = loginDto;

    // check if user exits
    const user = await this.prisma.users.findUnique({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateUserTokens(
      user.id,
    );

    // Store refresh token in database
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiryDate,
      },
    });

    // remove the password from the response
    const { password: _, ...result } = user;
    return {
      ...result,
      accessToken,
      refreshToken,
    };
  }

  // Handle the refresh tokens
  async refreshTokens(refreshTokenDto: RefreshTokenDTO) {
    const { token } = refreshTokenDto;

    // Fetch and validate refresh token
    const fetchRefreshToken = await this.prisma.refreshToken.findFirst({
      where: {
        token,
        expiryDate: { gte: new Date() },
      },
    });

    if (!fetchRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const { accessToken, refreshToken } = await this.generateUserTokens(
      fetchRefreshToken.userId,
    );

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
}
