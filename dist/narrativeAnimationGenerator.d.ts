import type { NarrativeScene } from './codeAnalyzer';
/**
 * Generate an animation video from narrative scenes
 */
export declare function generateNarrativeVideo(scenes: NarrativeScene[], audioPath: string, outputPath: string): Promise<void>;
/**
 * Generate narrative video from buffer (for serverless/Heroku)
 */
export declare function generateNarrativeVideoBuffer(scenes: NarrativeScene[], audioBuffer: Buffer): Promise<Buffer>;
//# sourceMappingURL=narrativeAnimationGenerator.d.ts.map