import { type Request } from "express";
export interface LoginRequest {
    email : string ,
    password : string
}




export interface AuthRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}