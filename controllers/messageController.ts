import Message from "../models/Messages";
import { Request, Response } from "express";
import { io } from "../server";
import { deleteFromCloudinary } from "../utils/cloudinary";

export const getRoomMessages = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    // Fetch all messages for the room, populated with sender info
    const messages = await Message.find({ room: roomId })
      .populate("sender", "username")
      .sort({ createdAt: 1 }); // Sort by creation time, oldest first

    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.id;

    if (!messageId) {
      return res.status(400).json({ message: "Message ID is required" });
    }

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can only delete your own messages" });
    }
    if (message.image) {
      try {
        await deleteFromCloudinary(message.image);
      } catch (error) {
        console.error("Failed to delete image from Cloudinary:", error);
        // Continue with message deletion even if image deletion fails
      }
    }
    const roomId = message.room.toString();
    await Message.findByIdAndDelete(messageId);

    // Emit socket event for real-time updates
    io.to(roomId).emit("message_deleted", { messageId, roomId });

    return res.status(200).json({ message: "Message deleted successfully", messageId });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
