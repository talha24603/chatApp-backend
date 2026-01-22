import { Request, Response } from "express";
import { onlineUsers } from "../server.js";
import User from "../models/User.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    // Return array of online user IDs
    const onlineUserIds = Array.from(onlineUsers.keys());
    res.json({ onlineUserIds });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { username } = req.body;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData: { username?: string; profileImage?: string } = {};

    // Update username if provided
    if (username && username.trim() !== user.username) {
      // Check if username is already taken by another user
      const existingUser = await User.findOne({
        username: username.trim(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      updateData.username = username.trim();
    }

    // Handle image upload
    if (file) {
      try {
        // Delete old image from Cloudinary if it exists
        if (user.profileImage) {
          await deleteFromCloudinary(user.profileImage);
        }

        // Upload new image to Cloudinary
        const imageUrl = await uploadToCloudinary(file);
        updateData.profileImage = imageUrl;
      } catch (uploadError: any) {
        return res
          .status(500)
          .json({ message: "Failed to upload image: " + uploadError.message });
      }
    }

    // Update user if there are changes
    if (Object.keys(updateData).length > 0) {
      Object.assign(user, updateData);
      await user.save();
    }

    // Return updated user data
    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id.toString(),
        username: user.username,
        profileImage: user.profileImage || "",
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};