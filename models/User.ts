import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: "",
    },
  },
  
  { timestamps: true }
);

// Hash password before saving (only if password is modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  
  // Only hash if password is not already hashed
  if (!this.password.startsWith("$2a$") && !this.password.startsWith("$2b$")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

export default mongoose.model("User", userSchema);
