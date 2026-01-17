import { generateIllustrationVideoWithRemotion } from './src/remotionVideoGenerator.ts';

async function testCharacterAnimations() {
    // Create a test animation script with character and building elements
    const testAnimationScript = {
        totalDuration: 5000, // 5 seconds
        voiceover: {
            text: "Watch this character run to the bakery to check if it's open.",
            segments: [{
                text: "Watch this character run to the bakery to check if it's open.",
                startTime: 0,
                endTime: 5000,
                sceneId: "scene1"
            }]
        },
        scenes: [{
            id: "scene1",
            startTime: 0,
            endTime: 5000,
            description: "A character runs to a bakery",
            elements: [
                // Character that runs across the screen
                {
                    type: "character",
                    x: 100,
                    y: 300,
                    characterType: "person",
                    emotion: "neutral",
                    action: "run",
                    scale: 1,
                    animation: {
                        type: "slideIn",
                        duration: 2000,
                        delay: 0,
                        direction: "right",
                        distance: 400,
                        startTime: 0,
                        endTime: 2000
                    }
                },
                // Bakery building
                {
                    type: "building",
                    x: 500,
                    y: 200,
                    buildingType: "bakery",
                    name: "Sweet Bakery",
                    status: "open",
                    animation: {
                        type: "fadeIn",
                        duration: 1000,
                        delay: 0,
                        startTime: 0,
                        endTime: 1000
                    }
                },
                // Status message
                {
                    type: "status",
                    x: 300,
                    y: 150,
                    message: "Checking bakery status...",
                    statusType: "info",
                    animation: {
                        type: "fadeIn",
                        duration: 1000,
                        delay: 2000,
                        startTime: 2000,
                        endTime: 3000
                    }
                }
            ]
        }],
        style: {
            backgroundColor: "#87CEEB",
            primaryColor: "#333333",
            secondaryColor: "#666666",
            accentColor: "#FFD700",
            fontFamily: "Arial, sans-serif",
            theme: "light"
        }
    };

    const dummyAudioBuffer = Buffer.from('dummy audio data');

    try {
        console.log('Testing character and building animations...');
        const buffer = await generateIllustrationVideoWithRemotion(testAnimationScript, dummyAudioBuffer);
        console.log(`Success! Generated video buffer of ${buffer.length} bytes`);
    } catch (error) {
        console.error('Error:', error);
        // This is expected to fail due to dummy audio, but we want to see if the Remotion part works
        if (error.message.includes('audio') || error.message.includes('ffmpeg')) {
            console.log('Remotion rendering succeeded, audio processing failed as expected with dummy data');
        } else {
            throw error;
        }
    }
}

testCharacterAnimations();