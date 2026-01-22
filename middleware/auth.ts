import jwt from "jsonwebtoken";
import User from "../models/User";
import { type Request, type Response, type NextFunction } from "express";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer "))
      return res.status(401).json({ message: "No token provided" });

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

    req.user = await User.findById(decoded.id).select("-password");

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
