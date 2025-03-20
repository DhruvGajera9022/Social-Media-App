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

    // generate jwt token
    const token = this.jwtService.sign({ userId: user.id });

    // remove the password from the response
    const { password: _, ...result } = user;
    return { ...result, token };
  }
}
