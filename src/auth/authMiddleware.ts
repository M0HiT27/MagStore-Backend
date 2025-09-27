import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token; 

    if (!token) {
      return res.status(401).json({ "detail": "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId: string;
      email: string;
    };

    req.user = decoded; 
    next(); 
  } catch (e) {
    // console.error(e);
    return res.status(401).json({ detail: "Invalid token" });
  }
};