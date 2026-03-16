import express, { type Express } from "express";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import roomRoutes from "./routes/room.js";
import messageRoutes from "./routes/messages.js";
import userRoutes from "./routes/user.js";
import { messages } from "./controllers/messages.js";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";

dotenv.config();

const app: Express = express();
const server = createServer(app);
export const io = new Server(server, { cors: { origin: "*" } });

// Redis adapter setup (optional - only if REDIS_URL is provided)
if (process.env.REDIS_URL) {
  // Validate Redis URL format
  const redisUrl = process.env.REDIS_URL.trim();
  if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
    console.error("❌ Invalid REDIS_URL format. Must start with 'redis://' or 'rediss://'");
    console.error("   Example: rediss://:password@host:port");
    console.warn("⚠️  Server will continue without Redis adapter");
  } else {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Socket.io Redis adapter connected");
      })
      .catch((err) => {
        console.error("❌ Redis adapter error:", err);
        console.warn("⚠️  Server will continue without Redis adapter (single instance mode)");
      });
  }
} else {
  console.warn("⚠️  REDIS_URL not set - running in single instance mode (no horizontal scaling)");
}

app.use(express.json());
app.use(cors());

// MongoDB connection with proper options
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000, // 30 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });
    
    console.log("✅ Connected to MongoDB Atlas");
    
    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });
    
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });
    
    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1); // Exit if MongoDB connection fails
  }
};

// Connect to MongoDB before setting up routes
await connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Track online users: userId -> Set of socketIds
export const onlineUsers = new Map<string, Set<string>>();

// Extended Socket interface
interface AuthenticatedSocket extends Socket {
  userId?: string;
}

// Socket authentication middleware
io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket: AuthenticatedSocket) => {
  const userId = socket.userId;
  
  if (!userId) {
    console.error("❌ Socket connected without userId");
    socket.disconnect();
    return;
  }

  console.log(`✅ User connected: ${socket.id} (userId: ${userId})`);

  // Check if this is a new user coming online (not just a new socket for an already online user)
  const wasAlreadyOnline = onlineUsers.has(userId);

  // Add user to online users
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)!.add(socket.id);

  // Send the newly connected user the list of all currently online users
  const allOnlineUserIds = Array.from(onlineUsers.keys());
  socket.emit("online_users_list", { onlineUserIds: allOnlineUserIds });

  // Only emit user online status if this user wasn't already online
  // (to avoid duplicate notifications for users with multiple tabs/devices)
  if (!wasAlreadyOnline) {
    io.emit("user_status", { userId, status: "online" });
  }

  socket.on("join_room", (roomId) => {
    console.log(`🔌 Socket ${socket.id} joining room: ${roomId}`);
    socket.join(roomId);
    console.log(`✅ Socket ${socket.id} joined room: ${roomId}`);
  });

  socket.on("disconnect", () => {
   console.log(`❌ User disconnected: ${socket.id} (userId: ${userId})`);
    
    // Remove socket from user's socket set
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      
      // If user has no more active sockets, mark as offline
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user_status", { userId, status: "offline" });
      }
    }
  });

  // Set up message handlers for this socket
  messages(io, socket);
});

server.listen(5000, () => console.log("Server running on 5000"));
