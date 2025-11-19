from openai import OpenAI

c = OpenAI(
    base_url="https://ai-gateway.sherpa.software/bytez/v1",
    api_key="3fa19abdd32c3290b291303a6e311743",
)


def generate(prompt):
    return c.images.generate(
        prompt=prompt,
        model="stable-diffusion-v1-5/stable-diffusion-v1-5",
        n=1,
        size="512x512",
    )


print(generate("a cat"))
