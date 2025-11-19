const testModelsAPI = async () => {
  try {
    const response = await fetch('http://localhost:3000/ai-horde/v1/models', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    console.log('Models Response:', data);
    
    if (data.error) {
      console.error('Error:', data.error);
    } else {
      console.log('Success! Available models:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
};

console.log('Testing AI Horde Models API...');
testModelsAPI();