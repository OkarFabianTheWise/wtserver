import { generateIllustrationVideoWithRemotion } from './src/remotionVideoGenerator.js';

async function testRemotion() {
    const testScript = `This is a test script for Remotion video generation.
It should scroll smoothly from top to bottom.

This is the second paragraph with more text to test the scrolling functionality.

And here's a third paragraph to make sure everything works properly.`;

    const audioBuffer = Buffer.from('dummy audio data'); // This will fail but let's see the error

    try {
        console.log('Testing Remotion video generation...');
        const buffer = await generateIllustrationVideoWithRemotion(testScript, audioBuffer);
        console.log(`Success! Generated video buffer of ${buffer.length} bytes`);
    } catch (error) {
        console.error('Error:', error);
    }
}

testRemotion();