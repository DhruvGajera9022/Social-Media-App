import { Response } from 'express';

// Success Response
export const successResponse = (
  res: Response,
  message: string = 'Success',
  data?: any,
): void => {
  res.status(200).json({ success: true, message, data });
};

// Error Response
export const errorResponse = (
  res: Response,
  statusCode: number,
  error: string,
) => {
  res.status(statusCode).json({ success: false, error });
};
