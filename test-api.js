// Complete workflow for video generation API

console.log('=== WEAVEIT VIDEO GENERATION API ===\n');

// 1. Generate video
console.log('1. START VIDEO GENERATION');
console.log('POST http://localhost:3001/api/generate');
console.log('Body:');
console.log(JSON.stringify({
    walletAddress: 'your-wallet-address',
    script: `Your tutorial script here.

This can be multiple paragraphs explaining your topic.

Add code examples, explanations, and step-by-step instructions.`,
    prompt: 'Optional: Custom instructions for narration style'
}, null, 2));

console.log('\nResponse will include:');
console.log('- jobId: Unique identifier for tracking');
console.log('- status: "generating"');
console.log('- creditsDeducted: 2');
console.log('- remainingCredits: Your balance after deduction\n');

// 2. Check status
console.log('2. CHECK GENERATION STATUS');
console.log('GET http://localhost:3001/api/videos/status/{jobId}');
console.log('\nResponse:');
console.log(JSON.stringify({
    jobId: 'job-123',
    status: 'completed', // or 'generating', 'failed'
    ready: true,
    videoAvailable: true,
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:05:00Z'
}, null, 2));

// 3. Get video
console.log('\n3. DOWNLOAD VIDEO');
console.log('GET http://localhost:3001/api/videos/job/{jobId}');
console.log('Returns: MP4 video file\n');

// Example curl commands
console.log('=== CURL EXAMPLES ===\n');

console.log('Generate video:');
console.log(`curl -X POST http://localhost:3001/api/generate \\
  -H "Content-Type: application/json" \\
  -d '{"walletAddress":"your-wallet","script":"Hello world tutorial","prompt":"Make it exciting"}'`);

console.log('\nCheck status:');
console.log('curl http://localhost:3001/api/videos/status/job-123');

console.log('\nDownload video:');
console.log('curl -o video.mp4 http://localhost:3001/api/videos/job/job-123');

console.log('\n=== WEBSOCKET PROGRESS ===');
console.log('Connect to: ws://localhost:3001');
console.log('Subscribe to job progress updates in real-time');