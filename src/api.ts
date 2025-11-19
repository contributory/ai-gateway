import { Readable } from "stream";

interface SpeechModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: null;
}

// Trả về Readable stream của Node.js để Koa xử lý
export async function generateSpeechStream(
  text: string,
  modelId: string,
  apiKey: string
): Promise<Readable> {
  // Bytez endpoint
  const url = `https://api.bytez.com/models/v2/${modelId}`;

  const options = {
    method: "POST",
    headers: {
      // Bytez thường dùng Bearer token, nếu api key của bạn chưa có chữ Bearer thì thêm vào
      // Nếu apiKey truyền vào đã có 'Bearer ' thì giữ nguyên.
      // Ở đây giả định apiKey truyền vào là raw key.
      Authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  };

  // Bước 1: Gọi Bytez để trigger tạo audio
  const response = await fetch(url, options);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Bytez API Error: ${response.status} - ${errText}`);
  }

  const data = await response.json();

  // Bytez trả về link download trong data.output
  if (!data.output) {
    throw new Error("No output URL returned from Bytez");
  }

  // Bước 2: Gọi vào link output để lấy luồng dữ liệu
  const audioResponse = await fetch(data.output);

  if (!audioResponse.ok || !audioResponse.body) {
    throw new Error("Failed to fetch audio stream from Bytez output URL");
  }

  // Chuyển đổi Web Stream (fetch) sang Node Stream (cho Koa)
  // @ts-ignore: Node 18+ hỗ trợ Readable.fromWeb, nếu TS báo lỗi type thì ignore
  return Readable.fromWeb(audioResponse.body);
}

export async function listSpeechModels(): Promise<SpeechModel[]> {
  const url = "https://api.bytez.com/models/v2/list/models?task=text-to-speech";
  const options = {
    method: "GET",
    headers: {
      Authorization: process.env.BYTEZ_API_KEY
        ? `Bearer ${process.env.BYTEZ_API_KEY}`
        : "",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    // Xử lý cấu trúc trả về của Bytez (đôi khi là data.output, đôi khi là mảng trực tiếp)
    const output = data.output || [];

    if (data.error) {
      console.error("Failed to list models:", data.error);
      throw new Error("Failed to fetch models from Bytez");
    }

    return output.map((model: any) => ({
      id: model.modelId,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "bytez",
      permission: [],
      root: model.modelId,
      parent: null,
    }));
  } catch (error) {
    console.error("Failed to fetch models:", error);
    // Trả về mảng rỗng hoặc throw tùy nhu cầu
    return [];
  }
}
