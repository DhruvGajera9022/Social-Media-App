export const Response = (status: boolean, message: string, data?: any) => {
  return {
    status,
    message,
    data,
  };
};
