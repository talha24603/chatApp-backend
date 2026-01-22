import type { Document } from "mongoose";

interface AuthenticatedUser extends Document {
  username: string;
  email: string;
}

declare global {
  namespace Express {
    // Attach the authenticated user document to the request object
    interface Request {
      user?: AuthenticatedUser | null;
    }
  }
}

export {};