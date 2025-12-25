async function testAI() {
    try {
        const response = await fetch('http://localhost:3000/api/ai/suggest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: "Hello",
                rules: { prompt: "Just say 'API Key is valid' in the summary" }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('AI Response:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testAI();
