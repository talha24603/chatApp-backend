import { Router } from "express";
import { getOnlineUsers, updateProfile } from "../controllers/userController.js";
import { auth } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.get("/online", auth, getOnlineUsers);
router.put("/profile", auth, upload.single("profileImage"), updateProfile);

export default router;

