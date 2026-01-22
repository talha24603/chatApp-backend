import Message from "../models/Messages";
import Room from "../models/Room";
import { Server, Socket } from "socket.io";

export const messages = (io: Server, socket: Socket) => {
  // When a user sends a message
  socket.on("send_message", async (data) => {
    try {
      const { roomId, userId, text, image } = data;
      console.log("📨 Received send_message:", { roomId, userId, text });

      // Validate required fields
      if (!roomId || !userId) {
        console.error("❌ Missing required fields:", { roomId, userId });
        socket.emit("send_message_error", { message: "Missing required fields" });
        return;
      }

      // Save message to DB
      const message = await Message.create({
        room: roomId,
        sender: userId,
        text: text || "",
        image: image || undefined,
      });
      console.log("💾 Message saved to DB:", message._id);

      // Populate sender info for frontend
      const populatedMessage = await message.populate("sender", "username");

      // Convert Mongoose document to plain object for Socket.io
      const sender = populatedMessage.sender as any;
      const messageData = {
        _id: populatedMessage._id.toString(),
        room: populatedMessage.room.toString(),
        sender: {
          _id: sender._id.toString(),
          username: sender.username,
        },
        text: populatedMessage.text,
        image: populatedMessage.image,
        createdAt: populatedMessage.createdAt?.toISOString(),
        updatedAt: populatedMessage.updatedAt?.toISOString(),
      };

      // Get all sockets in the room
      const socketsInRoom = await io.in(roomId).fetchSockets();
      console.log(`📤 Emitting to room ${roomId}, ${socketsInRoom.length} socket(s) in room`);

      // Emit message to all users in that room
      io.to(roomId).emit("receive_message", messageData);
      console.log("✅ Message emitted:", messageData);
    } catch (err) {
      console.error("❌ Error saving message:", err);
      socket.emit("send_message_error", { 
        message: err instanceof Error ? err.message : "Failed to send message" 
      });
    }
  });
  socket.on("delete_message", async (data) => {
    try {
      const { messageId, userId } = data;
      console.log("🗑️ Received delete_message:", { messageId, userId });

      if (!messageId) {
        socket.emit("delete_message_error", { message: "Message ID is required" });
        return;
      }

      if (!userId) {
        socket.emit("delete_message_error", { message: "Unauthorized" });
        return;
      }

      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit("delete_message_error", { message: "Message not found" });
        return;
      }

      if (message.sender.toString() !== userId) {
        socket.emit("delete_message_error", { message: "You can only delete your own messages" });
        return;
      }

      const roomId = message.room.toString();
      await Message.findByIdAndDelete(messageId);
      console.log("✅ Message deleted:", messageId);

      // Emit deletion event to all users in the room
      io.to(roomId).emit("message_deleted", { messageId, roomId });
      console.log("📤 Deletion event emitted to room:", roomId);
    } catch (err) {
      console.error("❌ Error deleting message:", err);
      socket.emit("delete_message_error", { message: "Failed to delete message" });
    }
  });
};
