import Koa from "koa";
import Router from "@koa/router";
import type { Context } from "koa";
// @ts-ignore
import koaBody from "koa-body";
import swaggerJSDoc from "swagger-jsdoc";
import { koaSwagger } from "koa2-swagger-ui";

import { listBytezModels, generateImage } from "./api/bytez.js";
import { generateImageHorde, getHordeModels } from "./api/horde.js";

const app = new Koa();

app.use(koaBody({ multipart: true, jsonLimit: "10mb" }));

// --- ROUTER 1: BYTEZ (Text-to-Speech) ---
const bytezRouter = new Router({ prefix: "/bytez/v1" });

/**
 * @openapi
 * /images/generations:
 *   post:
 *     tags:
 *       - Bytez
 *     summary: Generate images using Bytez API
 *     description: Creates images based on a text prompt using the Bytez service
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The text prompt to generate images from
 *                 example: "A beautiful landscape"
 *               model:
 *                 type: string
 *                 description: The model to use for image generation
 *                 example: "stable-diffusion-v1-5"
 *             required:
 *               - prompt
 *     responses:
 *       200:
 *         description: Successful image generation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         description: URL of the generated image
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized - missing or invalid API key
 *       500:
 *         description: Internal server error
 */
bytezRouter.post("/images/generations", async (ctx: Context) => {
  const auth = ctx.headers.authorization;
  if (!auth) {
    ctx.status = 401;
    ctx.body = { error: "Missing Authorization header" };
    return;
  }

  try {
    const body = ctx.request.body as any;
    const prompt = body.prompt;

    if (!prompt) {
      ctx.status = 400;
      ctx.body = { error: "Missing 'input' parameter" };
      return;
    }

    const apiKey = auth.replace("Bearer ", "");
    if (!apiKey) {
      ctx.status = 401;
      ctx.body = { error: "Missing API key" };
      return;
    }
    
    const response = await generateImage(prompt, body.model, apiKey);

    ctx.status = 200;
    ctx.body = response;
  } catch (error: any) {
    console.error("Bytez Error:", error);
    ctx.status = 500;
    ctx.body = { error: { message: error.message } };
  }
});

/**
 * @openapi
 * /models:
 *   get:
 *     tags:
 *       - Bytez
 *     summary: Get available models
 *     description: Returns a list of available models for the Bytez service
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 object:
 *                   type: string
 *                   example: "list"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Model identifier
 *                       name:
 *                         type: string
 *                         description: Model name
 *       500:
 *         description: Internal server error
 */
bytezRouter.get("/models", async (ctx: Context) => {
  try {
    const models = await listBytezModels();
    ctx.body = { object: "list", data: models };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

// --- ROUTER 2: AI HORDE (Image Generation) ---
const hordeRouter = new Router({ prefix: "/ai-horde/v1" });

/**
 * @openapi
 * /images/generations:
 *   post:
 *     tags:
 *       - AI Horde
 *     summary: Generate images using AI Horde
 *     description: Creates images based on a text prompt using the AI Horde service
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The text prompt to generate images from
 *                 example: "A beautiful landscape"
 *             required:
 *               - prompt
 *     responses:
 *       200:
 *         description: Successful image generation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         description: URL of the generated image
 *       400:
 *         description: Missing required parameters
 *       500:
 *         description: Internal server error
 */
hordeRouter.post("/images/generations", async (ctx: Context) => {
  const userApiKey =
    ctx.headers.authorization || (ctx.headers["apikey"] as string) || "";

  try {
    const body = ctx.request.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !body.prompt
    ) {
      ctx.status = 400;
      ctx.body = { error: { message: "Missing 'prompt' parameter" } };
      return;
    }

    const response = await generateImageHorde(body, userApiKey);

    ctx.status = 200;
    ctx.body = response;
  } catch (error: any) {
    console.error("Horde Error:", error);
    ctx.status = 500;
    ctx.body = {
      error: {
        message: error.message || "Image generation failed",
        type: "api_error",
      },
    };
  }
});

/**
 * @openapi
 * /models:
 *   get:
 *     tags:
 *       - AI Horde
 *     summary: Get available models
 *     description: Returns a list of available models for the AI Horde service
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 object:
 *                   type: string
 *                   example: "list"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Model identifier
 *                       name:
 *                         type: string
 *                         description: Model name
 *       500:
 *         description: Internal server error
 */
hordeRouter.get("/models", async (ctx: Context) => {
  try {
    const models = await getHordeModels();

    ctx.status = 200;
    ctx.body = {
      object: "list",
      data: models,
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Failed to fetch models" };
  }
});

// Swagger setup
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bytez Proxy API",
      version: "1.0.0",
      description: "A proxy server for Bytez and AI Horde APIs with Swagger documentation",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
        },
      },
    },
  },
  apis: ["./src/index.ts"], // files containing OpenAPI definitions
};

const swaggerSpec = swaggerJSDoc(options) as any;

// Swagger UI middleware
app.use(
  koaSwagger({
    routePrefix: "/docs",
    swaggerOptions: {
      spec: swaggerSpec,
    },
  })
);

app.use(bytezRouter.routes()).use(bytezRouter.allowedMethods());
app.use(hordeRouter.routes()).use(hordeRouter.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔊 Bytez Endpoint: http://localhost:${PORT}/bytez/v1`);
  console.log(`🎨 AI Horde Endpoint: http://localhost:${PORT}/ai-horde/v1`);
  console.log(`📖 Swagger Docs: http://localhost:${PORT}/docs`);
});
