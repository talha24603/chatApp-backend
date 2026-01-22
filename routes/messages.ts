import { Router } from "express";
import { deleteMessage, getRoomMessages } from "../controllers/messageController";
import { uploadToCloudinary } from "../utils/cloudinary";
import { auth } from "../middleware/auth";
import multer from "multer";

const router = Router();
const upload = multer({storage: multer.memoryStorage()});

router.get("/room/:roomId", getRoomMessages);
router.delete("/:messageId", auth, deleteMessage);
router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image provided" });
        }
       const imageUrl = await uploadToCloudinary(req.file);
       res.json({ imageUrl });
    } catch (error) {
        res.status(500).json({ message: "Failed to upload image" });
    }
});

export default router;

