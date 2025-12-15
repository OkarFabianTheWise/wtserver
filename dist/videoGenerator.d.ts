/**
 * FIXED: Main function with better synchronization logic
 */
export declare function generateVideo(tutorialText: string, audioPath: string, finalOutputPath: string): Promise<void>;
/**
 * Generate scrolling script video and return as buffer (for database storage)
 * Uses OS temp directory for ffmpeg processing, then cleans up automatically
 * Ephemeral-compatible: uses ephemeral /tmp directory with immediate cleanup
 */
/**
 * Generate a scrolling video from script + audio
 */
export declare function generateScrollingScriptVideo(script: string, audioPath: string, outputPath: string): Promise<void>;
export declare function generateScrollingScriptVideoBuffer(script: string, audioBuffer: Buffer): Promise<Buffer>;
//# sourceMappingURL=videoGenerator.d.ts.map