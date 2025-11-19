interface SpeechModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: null;
}

interface SpeechResponse {
  modelId: string;
  data: ArrayBuffer;
}

export async function generateSpeechBase64(
  text: string,
  modelId: string,
  apiKey: string
): Promise<SpeechResponse> {
  // Bytez endpoint
  const url = `https://api.bytez.com/models/v2/${modelId}`;
  
  const options = {
    method: "POST",
    headers: {
      Authorization: apiKey, // Lưu ý: kiểm tra xem Bytez cần "Bearer " hay chỉ apiKey thô
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  };

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

  const output = await fetch(data.output);
  return { modelId, data: await output.arrayBuffer() };
}

export async function listSpeechModels(): Promise<SpeechModel[]> {
  const url = "https://api.bytez.com/models/v2/list/models?task=text-to-speech";
  const options = {
    method: "GET",
    headers: { Authorization: process.env.BYTEZ_API_KEY || "" },
  };

  try {
    const response = await fetch(url, options);
    const { error, output } = await response.json();

    if (error) {
      console.error("Failed to list models:", error);
      throw new Error("Failed to fetch models");
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
    throw new Error("Failed to fetch models");
  }
}