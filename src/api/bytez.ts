import Bytez from "bytez.js";

interface ImageModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: null;
}

export async function generateImage(
  input: string,
  modelId: string,
  apiKey: string
): Promise<any> {
  const sdk = new Bytez(apiKey);
  const model = sdk.model(modelId);

  const { error, output } = await model.run(input);
  console.log({ error });

  if (error) {
    throw new Error(`Bytez API Error: ${error}`);
  }

  if (!output) {
    throw new Error("No output URL returned from Bytez");
  }

  return {
    created: Math.floor(Date.now() / 1000),
    data: [
      {
        url: output,
        revised_prompt: input,
      },
    ],
  };
}

export async function listBytezModels(): Promise<ImageModel[]> {
  const url = "https://api.bytez.com/models/v2/list/models?task=text-to-image";
  const options = {
    method: "GET",
    headers: {
      Authorization: process.env.BYTEZ_API_KEY ? process.env.BYTEZ_API_KEY : "",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

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
    return [];
  }
}
