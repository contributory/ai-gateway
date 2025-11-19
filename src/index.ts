import Koa from "koa";
import Router from "@koa/router";
import { listSpeechModels, generateSpeechStream } from "./api";
import type { Context } from "koa";
// @ts-ignore
import koaBody from "koa-body";

const app = new Koa();
const router = new Router();

// Tăng limit body vì đôi khi text input rất dài
app.use(koaBody({ multipart: true, jsonLimit: "10mb" }));

// Endpoint liệt kê models
router.get("/v1/models", async (ctx: Context) => {
  try {
    const models = await listSpeechModels();
    ctx.body = {
      object: "list",
      data: models,
    };
    ctx.status = 200;
  } catch (error) {
    console.error("Models endpoint error:", error);
    ctx.body = { error: "Internal server error" };
    ctx.status = 500;
  }
});

// Endpoint tạo speech (OpenAI Compatible)
router.post("/v1/audio/speech", async (ctx: Context) => {
  const authorization = ctx.headers.authorization;
  if (!authorization) {
    ctx.body = {
      error: {
        message: "Missing Authorization header",
        type: "invalid_request_error",
      },
    };
    ctx.status = 401;
    return;
  }

  // Giữ nguyên raw token để xử lý bên api.ts (hoặc tách ra tùy bạn)
  const apiKey = authorization;

  try {
    const body = ctx.request.body as {
      input?: string;
      text?: string;
      model?: string;
      voice?: string;
      response_format?: string;
      speed?: number; // OpenAI có hỗ trợ speed
    };

    const textToSpeech = body.input || body.text;
    const { model = "tts-1", response_format = "mp3" } = body;

    if (!textToSpeech) {
      ctx.body = {
        error: {
          message: "Missing required parameter: 'input'",
          type: "invalid_request_error",
          param: "input",
          code: "missing_required_parameter",
        },
      };
      ctx.status = 400;
      return;
    }

    // Lấy stream từ API
    const audioStream = await generateSpeechStream(textToSpeech, model, apiKey);

    // Set headers
    ctx.status = 200;
    ctx.type = getContentType(response_format);

    // OpenAI thường trả về Transfer-Encoding: chunked cho stream
    // Koa sẽ tự động xử lý chunked nếu body là stream
    ctx.set("Cache-Control", "no-cache");

    // Nếu muốn client tải về:
    // ctx.set("Content-Disposition", `attachment; filename="speech.${response_format}"`);

    // Pipe stream trực tiếp vào body
    ctx.body = audioStream;
  } catch (error: any) {
    console.error("TTS endpoint error:", error);
    // Trả lỗi JSON chuẩn OpenAI
    ctx.status = 500;
    ctx.type = "application/json";
    ctx.body = {
      error: {
        message: error.message || "Internal server error",
        type: "api_error",
        param: null,
        code: null,
      },
    };
  }
});

function getContentType(format: string): string {
  const types: Record<string, string> = {
    mp3: "audio/mpeg",
    opus: "audio/opus",
    aac: "audio/aac",
    flac: "audio/flac",
    wav: "audio/wav",
    pcm: "audio/pcm",
  };
  return types[format] || "audio/mpeg";
}

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
