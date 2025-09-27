import express, { type Request, type Response } from "express";
import { PrismaClient } from "@prisma/client";
import type { AuthRequest } from "../types/userTypes.ts";
import Stripe from "stripe";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_51SBrcTRpo1ZvanQlc2ceVXfiwCdHJgGEyLFI7ddJVJKIR5dG52kWk1KD7SQxSUMVD0liBDvd9p53Uv6Tb0ZBu4XP006PoVHtOE";
const cartrouter = express.Router();
const prisma = new PrismaClient();
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-08-27.basil',
});
cartrouter.get("/", async (req : Request, res : Response) => {
    try{
        const authReq = req as AuthRequest;
        const user = await prisma.user.findFirst({
            where:{
                id : authReq.user.userId
            }
        });
        if(!user){
            res.status(404).json({"detail":"User not found"});
            return;
        }
        const cart = await prisma.cart.findFirst({
            where:{
                userId : user.id
            }
        })
        //@ts-ignore
        const cartItems = [];
        if(!cart){
            res.json({"items":[]});
            return;
        }
        console.log(cart.items.length);
        await Promise.all(cart.items.map(async (itemId)=>{
            // console.log(itemId);
            const item = await prisma.item.findFirst({
                where:{
                    id : itemId
                }
            })
            // console.log(item);
            if(item){
                cartItems.push(item);
            }
        }))
        //@ts-ignore
        // console.log(cartItems);
        //@ts-ignore
        res.json({"items":cartItems});
    }catch(e){
        res.status(500).json({"detail":"Internal server error"});
        return;
    }
})
cartrouter.post("/:id", async (req : Request, res : Response) => {
    try{
        const authReq = req as AuthRequest;
        const user = await prisma.user.findFirst({
            where:{
                id : authReq.user.userId
            }
        });
        const {id} = req.params;
        if(!id){
            throw new Error("Item id is required");
        }
        if(!user){
            res.status(404).json({"detail":"User not found"});
            return;
        }
        const cart = await prisma.cart.findFirst({
            where:{
                userId : user.id
            }
        })
        if(!cart){
            const newCart = await prisma.cart.create({
                data:{
                    userId : user.id,
                    items : [id]
                }
            })
            res.json(newCart);
            return;
        }
        if(cart.items.includes(id)){
            res.status(400).json({"detail":"Item already in cart"});
            return;
        }   
        cart.items.push(id);
        const updatedCart = await prisma.cart.update({
            where:{
                id : cart.id
            },
            data:{
                items : cart.items
            }
        })
        res.json(updatedCart);
        return;
    }catch(e){
        res.status(500).json({"detail":"Internal server error"});
        return;
    }
})

cartrouter.put("/checkout" ,async(req : Request, res : Response) => {
    try{
        console.log("Checkout request");
        const {email} = req.body;
        if(!email){
            res.status(400).json({"detail":"Email is required"});
            return;
        }
        console.log(email)
        const authReq = req as AuthRequest;
        const user = await prisma.user.findFirst({
            where:{
                id : authReq.user.userId
            }
        });
        if(!user){
            res.status(404).json({"detail":"User not found"});
            return;
        }
        console.log(user);
        const cart = await prisma.cart.findFirst({
            where:{
                userId : user.id    
            }});
        if(!cart || cart.items.length === 0){
            res.status(400).json({"detail":"Cart is empty"});
            return;
        }
        console.log(cart);
        //@ts-ignore
        const cartItems = [];
        await Promise.all(cart.items.map(async (itemId)=>{
            const item = await prisma.item.findFirst({
                where:{
                    id : itemId
                }
            })
            if(item){
                cartItems.push(item);
            }
        }))
        //@ts-ignore
        const totalAmount = cartItems.reduce((acc, item) => acc + item.price, 0);
        console.log(totalAmount);
        const order = await prisma.order.create({
            data : {
                userId : user.id,
                items : cart.items,
                total : totalAmount
            }
        })
        console.log(order);
        console.log(stripe)
        //@ts-ignore
        const session = await stripe.checkout.sessions.create({
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/failure',
        customer_email : email,
        payment_method_types: ['card'],
        metadata :{
            orderID : order.id,
            email : email
        },
        line_items: [
            {
            price_data:{
                currency: 'inr',
                product_data: {
                    name: 'Total Cart Amount',  
                },
                unit_amount: totalAmount * 100 ,
            },
            quantity: 1,
            },
        ],
        mode: 'payment',
        });
    console.log(session);
    res.send(session.url);
    return;

    }catch(e){

    }
})

export default cartrouter;