import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

export const generateToken = (userId: string) => {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  
  const expiresIn: StringValue | number = (process.env.JWT_EXPIRES || "7d") as StringValue;
  
  return jwt.sign({ id: userId }, secret, {
    expiresIn,
  });
};
