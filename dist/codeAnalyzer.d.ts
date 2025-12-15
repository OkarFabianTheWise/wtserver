import type { TutorialResult } from './types';
export declare function analyzeCode(code: string): Promise<TutorialResult>;
export declare function enhanceScript(script: string): Promise<string>;
export declare function enhanceScriptDirect(script: string): Promise<string>;
/**
 * Convert technical content into narrative scenes for 2D animation
 * Returns a story with sequential scenes that can be visualized
 */
export interface NarrativeScene {
    sceneNumber: number;
    description: string;
    narration: string;
    visualElements: string[];
    duration: number;
}
export declare function generateNarrativeStoryboard(script: string): Promise<NarrativeScene[]>;
//# sourceMappingURL=codeAnalyzer.d.ts.map