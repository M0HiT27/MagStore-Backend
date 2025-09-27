import express, { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import type { AuthRequest } from "../types/userTypes.ts";


const itemrouter = express.Router();
const prisma = new PrismaClient();

itemrouter.get("/", async (req : Request, res : Response) => {
    const items = await prisma.item.findMany();
    res.json(items);
})

export default itemrouter;
