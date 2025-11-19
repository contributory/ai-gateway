import Koa from "koa";
import Router from "@koa/router";
import type { Context } from "koa";
// @ts-ignore
import koaBody from "koa-body";

// Import các hàm xử lý
import { listSpeechModels, generateSpeechStream } from "./api"; // File API Bytez cũ
import { generateImageHorde, getHordeModels } from "./horde"; // File Horde mới

const app = new Koa();
// Tăng limit body vì request ảnh/audio có thể lớn
app.use(koaBody({ multipart: true, jsonLimit: "10mb" }));

// --- ROUTER 1: BYTEZ (Text-to-Speech) ---
const bytezRouter = new Router({ prefix: "/bytez/v1" });

bytezRouter.get("/models", async (ctx: Context) => {
  try {
    const models = await listSpeechModels();
    ctx.body = { object: "list", data: models };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { error: "Internal server error" };
  }
});

bytezRouter.post("/audio/speech", async (ctx: Context) => {
  const auth = ctx.headers.authorization;
  if (!auth) {
    ctx.status = 401;
    ctx.body = { error: "Missing Authorization header" };
    return;
  }

  try {
    const body = ctx.request.body as any;
    const text = body.input || body.text;

    if (!text) {
      ctx.status = 400;
      ctx.body = { error: "Missing 'input' parameter" };
      return;
    }

    const stream = await generateSpeechStream(
      text,
      body.model || "tts-1",
      auth
    );

    ctx.set("Content-Type", "audio/mpeg"); // Mặc định mp3
    ctx.body = stream;
  } catch (error: any) {
    console.error("Bytez Error:", error);
    ctx.status = 500;
    ctx.body = { error: { message: error.message } };
  }
});

// --- ROUTER 2: AI HORDE (Image Generation) ---
const hordeRouter = new Router({ prefix: "/ai-horde/v1" });

// Endpoint tạo ảnh (Tương thích OpenAI: POST /images/generations)
hordeRouter.post("/images/generations", async (ctx: Context) => {
  // Lấy API Key từ header (Authorization hoặc apikey)
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

    // Gọi hàm xử lý bên file horde.ts
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

// --- KẾT NỐI ROUTER ---
app.use(bytezRouter.routes()).use(bytezRouter.allowedMethods());
app.use(hordeRouter.routes()).use(hordeRouter.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `🔊 TTS Endpoint: http://localhost:${PORT}/bytez/v1/audio/speech`
  );
  console.log(
    `🎨 Image Endpoint: http://localhost:${PORT}/ai-horde/v1/images/generations`
  );
});
