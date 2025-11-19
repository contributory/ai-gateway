const testHordeAPI = async () => {
  const prompt = "A beautiful landscape with mountains and a lake";
  
  try {
    const response = await fetch('http://localhost:3000/ai-horde/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 00000000' // Using the default public API key
      },
      body: JSON.stringify({
        prompt: prompt,
        response_format: 'url'
      })
    });

    const data = await response.json();
    console.log('Response:', data);
    
    if (data.error) {
      console.error('Error:', data.error);
    } else {
      console.log('Success! Generated image data:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

console.log('Testing AI Horde API integration...');
testHordeAPI();