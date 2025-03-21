import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'serena.nolan95@ethereal.email',
        pass: '9K7aRTTJJEEZzHDZcG',
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetLink = `http://localhost:5001/reset-password?token=${token}`;
    const mailOptions = {
      from: 'Nest Project',
      to: to,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset. Click the link below th reset your password:<p><a href="${resetLink}">Reset Password</a></p></p>`,
    };
    await this.transporter.sendMail(mailOptions);
  }
}
