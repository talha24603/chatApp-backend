// mo'dels/Room.js
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: { type: String },
  isGroup: { type: Boolean, default: false },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  profileImage: { type: String, default: "" },
});

export default mongoose.model("Room", roomSchema);
