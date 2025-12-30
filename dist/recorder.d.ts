export declare class VideoRecorder {
    private browser;
    private page;
    initialize(): Promise<void>;
    recordVideo(script: string, outputPath: string, duration?: number, fps?: number): Promise<Buffer>;
    close(): Promise<void>;
}
declare global {
    interface Window {
        animationComplete?: boolean;
        getCanvasStream?: (fps: number) => MediaStream;
    }
}
//# sourceMappingURL=recorder.d.ts.map