// test-horde.js

// CẤU HÌNH
const API_KEY = "0000000000"; // Key ẩn danh (miễn phí nhưng chờ lâu hơn)
const BASE_URL = "https://stablehorde.net/api/v2";
const CLIENT_AGENT = "JS_Test_Script:1.0:user"; // Bắt buộc phải có tên ứng dụng

// Hàm chờ (Sleep)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  try {
    // 1. TẠO YÊU CẦU (POST)
    console.log("🚀 Đang gửi yêu cầu tạo ảnh...");

    const prompt =
      "A beautiful landscape, mountains, sunset, highly detailed, 8k, masterpiece";

    const payload = {
      prompt: prompt,
      params: {
        sampler_name: "k_euler_a",
        cfg_scale: 7.5,
        steps: 25,
        width: 512,
        height: 512,
        n: 1, // Số lượng ảnh
      },
      nsfw: false,
      censor_nsfw: true,
      models: ["stable_diffusion"], // Có thể đổi thành 'ICBINP - I Can't Believe It's Not Photography' v.v.
    };

    const response = await fetch(`${BASE_URL}/generate/async`, {
      method: "POST",
      headers: {
        apikey: API_KEY,
        "Client-Agent": CLIENT_AGENT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Lỗi gửi request: ${response.statusText}`);
    }

    const data = await response.json();
    const id = data.id;
    console.log(`✅ Đã nhận ID: ${id}`);

    // 2. VÒNG LẶP KIỂM TRA TRẠNG THÁI (POLLING)
    let isDone = false;
    let attempts = 0;

    while (!isDone) {
      attempts++;
      await sleep(3000); // Chờ 3 giây mỗi lần check

      const checkResponse = await fetch(`${BASE_URL}/generate/status/${id}`, {
        method: "GET",
        headers: {
          "Client-Agent": CLIENT_AGENT,
        },
      });

      const checkData = await checkResponse.json();

      if (checkData.done) {
        isDone = true;
        console.log("\n🎉 Xử lý xong!");

        // In ra link ảnh
        checkData.generations.forEach((gen, index) => {
          console.log(`👉 Ảnh ${index + 1}: ${gen.img}`);
        });
      } else {
        // Hiển thị trạng thái chờ
        process.stdout.write(
          `\r⏳ Đang chờ worker xử lý... (Lần check: ${attempts} | Hàng chờ: ${checkData.wait_time}s)`
        );
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("\n❌ Có lỗi xảy ra:", error.message);
    } else {
      console.error("\n❌ Có lỗi xảy ra:", error);
    }
  }
}

// Chạy chương trình
main();
