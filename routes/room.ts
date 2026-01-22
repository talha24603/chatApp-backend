import { Router } from "express";
import { privateRoom, groupRoom, getUserRooms, updateRoomProfile } from "../controllers/roomController";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.post("/private-room", privateRoom);
router.post("/group-room", groupRoom);
router.get("/user/:userId", getUserRooms);
router.put("/:roomId/profile", auth, upload.single("profileImage"), updateRoomProfile);
export default router;