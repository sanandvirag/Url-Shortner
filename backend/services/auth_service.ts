import bcrypt from "bcrypt";
import {prisma} from "../lib/prisma";
import jwt from "jsonwebtoken";

export const registerUser = async (email: string, password: string) => {

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
        where: {
            email: normalizedEmail
        }
    });

    if (existingUser) {
        throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email: normalizedEmail,
            password: hashedPassword
        }
    });

    return user;
};


export const loginUser = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where: {
            email: normalizedEmail
        }
    });

    if (!user) {
        throw new Error("Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatch) {
        throw new Error("Invalid credentials");
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
        {
            userId: user.id
        },
        jwtSecret,
        {
            expiresIn: "7d"
        }
    );

    return {
        user,
        token
    };
};

