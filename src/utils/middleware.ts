import {NextFunction, RequestHandler} from "express";

declare global {
    namespace Express {
        interface Request {
            apiKey?: string;
        }
    }
}

export const apiKeyAuth: RequestHandler = (req, res, next) => {
    // @ts-ignore
    const apiKey = req.headers["x-api-key"] || req.headers["authorization"];

    if (!apiKey) {
        // @ts-ignore
        return res.status(401).json({ error: "API Key required" });
    }

    if (apiKey !== process.env.API_KEY && apiKey !== 'Bearer ' + process.env.API_KEY) {
        // @ts-ignore
        return res.status(403).json({ error: "Invalid API Key" });
    }

    next();
}