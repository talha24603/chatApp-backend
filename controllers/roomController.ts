import Room from "../models/Room";
import User from "../models/User";
import { Request, Response } from "express";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

export const privateRoom = async (req: Request, res: Response) => {
    try {
      const { user1, user2 } = req.body;
  
      // Convert usernames to user IDs if needed
      let user1Id = user1;
      let user2Id = user2;
  
      // Check if user1 is a username (not an ObjectId)
      if (typeof user1 === 'string' && !user1.match(/^[0-9a-fA-F]{24}$/)) {
        const user1Doc = await User.findOne({ username: user1 });
        if (!user1Doc) {
          return res.status(404).json({ message: `User "${user1}" not found` });
        }
        user1Id = user1Doc._id.toString();
      }
  
      // Check if user2 is a username (not an ObjectId)
      if (typeof user2 === 'string' && !user2.match(/^[0-9a-fA-F]{24}$/)) {
        const user2Doc = await User.findOne({ username: user2 });
        if (!user2Doc) {
          return res.status(404).json({ message: `User "${user2}" not found` });
        }
        user2Id = user2Doc._id.toString();
      }
  
      // Check if a room between these users already exists
      let room = await Room.findOne({
        isGroup: false,
        members: { $all: [user1Id, user2Id], $size: 2 },
      });
  
      if (!room) {
        room = await Room.create({
          isGroup: false,
          members: [user1Id, user2Id],
        });
      }
  
      res.json(room);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }
  export const groupRoom = async (req: Request, res: Response) => {
    try {
      const { name, memberIds, createdBy } = req.body;
  
      // Convert usernames to user IDs if needed
      const convertedMemberIds = await Promise.all(
        memberIds.map(async (member: string) => {
          // Check if it's a username (not an ObjectId)
          if (typeof member === 'string' && !member.match(/^[0-9a-fA-F]{24}$/)) {
            const userDoc = await User.findOne({ username: member });
            if (!userDoc) {
              throw new Error(`User "${member}" not found`);
            }
            return userDoc._id.toString();
          }
          return member;
        })
      );
  
      // Convert createdBy if it's a username
      let createdById = createdBy;
      if (typeof createdBy === 'string' && !createdBy.match(/^[0-9a-fA-F]{24}$/)) {
        const createdByDoc = await User.findOne({ username: createdBy });
        if (!createdByDoc) {
          return res.status(404).json({ message: `User "${createdBy}" not found` });
        }
        createdById = createdByDoc._id.toString();
      }
  
      const room = await Room.create({
        name,
        isGroup: true,
        members: convertedMemberIds,
        createdBy: createdById,
        admin: createdById, // Set admin to the creator
      });
  
      res.status(201).json(room);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  export const getUserRooms = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // Convert username to user ID if needed
      let userIdObj = userId;
      if (typeof userId === 'string' && !userId.match(/^[0-9a-fA-F]{24}$/)) {
        const userDoc = await User.findOne({ username: userId });
        if (!userDoc) {
          return res.status(404).json({ message: `User "${userId}" not found` });
        }
        userIdObj = userDoc._id.toString();
      }

      // Find all rooms where user is a member
      const rooms = await Room.find({
        members: userIdObj,
      })
        .populate("members", "username profileImage")
        .populate("createdBy", "username profileImage")
        .populate("admin", "username profileImage")
        .sort({ updatedAt: -1 }); // Sort by most recently updated

      res.json(rooms);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  }

  export const updateRoomProfile = async (req: Request, res: Response) => {
    try {
      const userId = req.user?._id;
      const { roomId } = req.params;
      const file = req.file;
  
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
  
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
  
      if (!room.isGroup) {
        return res.status(400).json({ message: "Only group rooms can have profile images" });
      }
  
      // Check if user is admin
      if (!room.admin) {
        return res.status(403).json({ message: "Room has no admin" });
      }
      const adminId = String(room.admin);
      const currentUserId = String(userId);
      if (adminId !== currentUserId) {
        return res.status(403).json({ message: "Only group admin can update profile image" });
      }
  
      // Handle image upload
      if (file) {
        try {
          // Delete old image from Cloudinary if it exists
          if (room.profileImage) {
            await deleteFromCloudinary(room.profileImage);
          }
  
          // Upload new image to Cloudinary
          const imageUrl = await uploadToCloudinary(file);
          room.profileImage = imageUrl;
          await room.save();
        } catch (uploadError: any) {
          return res
            .status(500)
            .json({ message: "Failed to upload image: " + uploadError.message });
        }
      } else {
        return res.status(400).json({ message: "No image file provided" });
      }
  
      // Return updated room data
      const updatedRoom = await Room.findById(roomId)
        .populate("members", "username profileImage")
        .populate("createdBy", "username profileImage")
        .populate("admin", "username profileImage");
  
      res.json({
        message: "Group profile image updated successfully",
        room: updatedRoom,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  };