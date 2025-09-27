import dotenv from 'dotenv'; 
dotenv.config();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const FRONTEND_URL = process.env.FRONTEND_URL || "localhost" 
import express  from "express";
import { PrismaClient } from '@prisma/client';
import bcrypt from "bcrypt";
import type {Request , Response} from "express";
import z from 'zod';
import { loginSchema, signupSchema } from './zodSchemas/user.js';
import { ZodError } from 'zod';
import jwt from "jsonwebtoken";
import { authMiddleware } from './auth/authMiddleware.js';
import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from "cors";

import itemrouter from './routes/itemRoutes.js';
import cartrouter from './routes/cartRouter.js';
import Stripe from "stripe";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_51SBrcTRpo1ZvanQlc2ceVXfiwCdHJgGEyLFI7ddJVJKIR5dG52kWk1KD7SQxSUMVD0liBDvd9p53Uv6Tb0ZBu4XP006PoVHtOE";
const STRIPE_ENDPOINT_SECRET : string = process.env.STRIPE_ENDPOINT_SECRET || "";
const app = express();


const allowedOrigins = [
  'http://localhost:3000',
  "https://api.stripe.com",
  FRONTEND_URL
];

const corsOptions: CorsOptions = {
  origin: function (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void
  ): void {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

const prisma = new PrismaClient();

app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send("Webhook Error: Missing signature");
  }
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_ENDPOINT_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed: ${err}`);
    return res.status(400).send(`Webhook Error: ${err}`);
  }

  switch (event.type) {
    case 'charge.succeeded': {
        const charge = event.data.object;
        
        break;
    }
    case 'payment_intent.succeeded': {
      
    
      break;
    }
    case 'checkout.session.completed': {
      const session = event.data.object;

    const orderId = session.metadata?.orderID;
    if (!orderId) {
      console.log("Order ID is undefined in metadata");
      break;
    }

    console.log(`Checkout session completed for order ${orderId}`);

    // Ensure txnId is string
    const txnId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'Completed',
        txnId : txnId,
      },
    });

    // clear user cart
    await prisma.cart.updateMany({
      where: { userId: order.userId },
      data: { items: [] },
    });

    break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
type SignupRequest = z.infer<typeof signupSchema>
type LoginRequest = z.infer<typeof loginSchema>


app.use(express.json());
app.post("/login" , async(req : Request<{},{},LoginRequest> , res : Response )=>{
    try{
        const parseResult = loginSchema.safeParse(req.body);
        if(!parseResult.success){
            throw parseResult.error;
        }
        const {email ,password} = parseResult.data;
        const user = await prisma.user.findUnique({where : {
            email : email
        }})
        
        if(!user){
            res.status(404).json({"detail":"User not found"});
            return ;
        }
        const hashCompare = await bcrypt.compare(password , user.password);
        if(hashCompare){
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET as string,
                { expiresIn: "1d" }
            );

            
            res.cookie("token", token, {
                httpOnly: true,     
                // secure: process.env.mode === "production", 
                // sameSite: "none", 
                maxAge:24 * 60 * 60 * 1000,
                domain:FRONTEND_URL,
                path : "/"
            });

            res.status(200).json({"detail" : "User Logged in"})
            return ;
        }
        res.status(401).json({"detail" : "Invalid password"})
        return;
    }catch(e){
        if(e instanceof ZodError){
            const issue = (e.issues[0]?.message) || "Invalid input";
            res.status(400).json({"detail":issue});
            return;
        }
        res.status(500).json({"detail" : "Internal Server error"})
        return ;
    }
})
app.post("/signup" , async(req : Request<{},{},SignupRequest> , res : Response )=>{
    try{
        console.log(`Signup request`)
        const parseResult = signupSchema.safeParse(req.body);
        if(!parseResult.success){
            throw parseResult.error;
        }
        const { email, password, name } = parseResult.data;
        const user = await prisma.user.findFirst({where : {
            email : email
        }})
        if(user){
            res.status(400).json({"detail":"Email already exists"});
            return ;
        }
        const hashedPassword = await bcrypt.hash(password , 5);
        const createUser = await prisma.user.create({
            data :{
                email : email ,
                name : name , 
                password : hashedPassword
            }
        })
        if(createUser){
            res.status(200).json({"detail":"User signup successful!!!"});
            return;
        }
        res.status(500).json({"detail":"User creation failed"});
        return;
    }catch(e){

        if(e instanceof ZodError){
            const issue = (e.issues[0]?.message) || "Invalid input";
            res.status(400).json({"detail":issue});
            return;
        }

        res.status(500).json({"detail":"Internal server error"});
        return ;
    }
})

app.get("/" , (req : Request , res : Response)=>{
    res.send("Hello world");
})
app.use(cookieParser());
app.use(authMiddleware);
app.use("/api/item" , itemrouter);
app.use("/api/cart" , cartrouter);


const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});





function init() {
    app.listen(PORT , ()=>{
        console.log(`Server running on port : ${PORT}`)
    })
}
init();