import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { type Request, type Response } from "express";

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Check existing user
    const exist = await User.findOne({ username });
    if (exist) return res.status(400).json({ message: "User already exists" });

    // Create user - password will be hashed by pre-save hook
    const user = await User.create({
      username,
      password, // Pre-save hook will hash this
    });

    // Remove password from response
   // const userResponse = { id: user._id, username: user.username };
    res.json({ message: "User registered successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(500).json({ message: "User password not found" });
    }

    // Debug: Check if password is already hashed (starts with $2a$ or $2b$)
    const isPasswordHashed = user.password.startsWith("$2a$") || user.password.startsWith("$2b$");
    
    if (!isPasswordHashed) {
      console.error("Password in database is not hashed properly");
      return res.status(500).json({ message: "Database error: password not hashed" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.error("Password comparison failed for user:", username);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // JWT Token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: { 
        id: user._id, 
        username: user.username,
        profileImage: user.profileImage || "",
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
