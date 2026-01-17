import { Composition } from 'remotion';
import { IllustrationVideo } from './IllustrationVideo';
import type { AnimationScript } from '../types';

export const RemotionRoot = () => {
  return (
    <Composition
      id="IllustrationComposition"
      component={IllustrationVideo}
      durationInFrames={Math.floor(30 * 60)} // Default 60 seconds at 30fps, will be overridden
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        animationScript: {
          totalDuration: 60000,
          voiceover: {
            text: '',
            segments: []
          },
          scenes: [],
          style: {
            backgroundColor: '#1F2937',
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            accentColor: '#F59E0B',
            fontFamily: 'Inter, sans-serif',
            theme: 'modern'
          }
        } as AnimationScript
      }}
    />
  );
};