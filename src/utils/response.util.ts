import { Response } from 'express';

// Success Response
export const successResponse = (
  res: Response,
  message: string = 'Success',
  statusCode: number = 200,
  data?: any,
): void => {
  res.status(statusCode).json({ success: true, message, data });
};

// Error Response
export const errorResponse = (
  res: Response,
  statusCode: number,
  error: string,
) => {
  res.status(statusCode).json({ success: false, error });
};
