import Koa from "koa";
import Router from "@koa/router";
import type { Context } from "koa";
// @ts-ignore
import koaBody from "koa-body";

import { listBytezModels, generateImage } from "./api/bytez";
import { generateImageHorde, getHordeModels } from "./api/horde";

const app = new Koa();

app.use(koaBody({ multipart: true, jsonLimit: "10mb" }));

// --- ROUTER 1: BYTEZ (Text-to-Speech) ---
const bytezRouter = new Router({ prefix: "/bytez/v1" });

bytezRouter.post("/images/generations", async (ctx: Context) => {
  const auth = ctx.headers.authorization;
  if (!auth) {
    ctx.status = 401;
    ctx.body = { error: "Missing Authorization header" };
    return;
  }

  try {
    const body = ctx.request.body as any;
    const input = body.input;

    if (!input) {
      ctx.status = 400;
      ctx.body = { error: "Missing 'input' parameter" };
      return;
    }

    const response = await generateImage(input, body.model, auth);

    ctx.status = 200;
    ctx.body = response;
  } catch (error: any) {
    console.error("Bytez Error:", error);
    ctx.status = 500;
    ctx.body = { error: { message: error.message } };
  }
});

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

app.use(bytezRouter.routes()).use(bytezRouter.allowedMethods());
app.use(hordeRouter.routes()).use(hordeRouter.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔊 Bytez Endpoint: http://localhost:${PORT}/bytez/v1`);
  console.log(`🎨 AI Horde Endpoint: http://localhost:${PORT}/ai-horde/v1`);
});
