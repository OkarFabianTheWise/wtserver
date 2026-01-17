// src/index.ts
import { registerRoot } from 'remotion';

import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);

// src/RemotionAnimation.tsx
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

// Type definitions
interface AnimationScript {
  totalDuration: number;
  voiceover: {
    text: string;
    segments: any[];
  };
  scenes: Scene[];
  style: StyleConfig;
}

interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  description: string;
  elements: any[];
  transitions?: any;
}

interface StyleConfig {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  theme: string;
}

// Your animation data
const animationData: AnimationScript = {
  totalDuration: 35000,
  voiceover: {
    text: "Imagine you're on a bustling city street, trying to find a particular shop, let's say, a bakery...",
    segments: []
  },
  scenes: [
    {
      id: 'scene_1',
      startTime: 0,
      endTime: 20000,
      description: 'App character on city street running towards bakery, convey the return of good response',
      elements: [],
      transitions: {}
    },
    {
      id: 'scene_2',
      startTime: 20000,
      endTime: 35000,
      description: 'App character looking dejected, convey the return of bad response',
      elements: []
    }
  ],
  style: {
    backgroundColor: '#1F2937',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    fontFamily: 'Inter, sans-serif',
    theme: 'modern'
  }
};

// Character Component
const AppCharacter: React.FC<{ x: number; y: number; isHappy: boolean; scale?: number }> = ({ 
  x, 
  y, 
  isHappy,
  scale = 1 
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Bobbing animation
  const bob = Math.sin(frame / 5) * 3;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + bob,
        transform: `scale(${scale})`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Body */}
      <div
        style={{
          width: 60,
          height: 80,
          backgroundColor: animationData.style.primaryColor,
          borderRadius: '30px 30px 20px 20px',
          position: 'relative',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Face */}
        <div style={{ position: 'absolute', top: 15, left: 15 }}>
          {/* Eyes */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div
              style={{
                width: 8,
                height: isHappy ? 8 : 6,
                backgroundColor: 'white',
                borderRadius: '50%',
              }}
            />
            <div
              style={{
                width: 8,
                height: isHappy ? 8 : 6,
                backgroundColor: 'white',
                borderRadius: '50%',
              }}
            />
          </div>
          {/* Mouth */}
          <div
            style={{
              marginTop: 8,
              marginLeft: 5,
              width: 20,
              height: isHappy ? 10 : 8,
              borderBottom: isHappy ? '3px solid white' : '3px solid #aaa',
              borderRadius: isHappy ? '0 0 10px 10px' : '10px 10px 0 0',
            }}
          />
        </div>
        
        {/* Arms */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: -10,
            width: 8,
            height: 25,
            backgroundColor: animationData.style.primaryColor,
            borderRadius: 4,
            transform: `rotate(${isHappy ? -20 : 10}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: -10,
            width: 8,
            height: 25,
            backgroundColor: animationData.style.primaryColor,
            borderRadius: 4,
            transform: `rotate(${isHappy ? 20 : -10}deg)`,
          }}
        />
        
        {/* Legs */}
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            left: 10,
            width: 8,
            height: 20,
            backgroundColor: animationData.style.primaryColor,
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            right: 10,
            width: 8,
            height: 20,
            backgroundColor: animationData.style.primaryColor,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
};

// Bakery Component
const Bakery: React.FC<{ x: number; y: number; isOpen: boolean }> = ({ x, y, isOpen }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
      }}
    >
      {/* Building */}
      <div
        style={{
          width: 120,
          height: 150,
          backgroundColor: '#8B4513',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {/* Roof */}
        <div
          style={{
            position: 'absolute',
            top: -30,
            left: -10,
            width: 0,
            height: 0,
            borderLeft: '70px solid transparent',
            borderRight: '70px solid transparent',
            borderBottom: `30px solid ${animationData.style.accentColor}`,
          }}
        />
        
        {/* Sign */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            left: 10,
            width: 100,
            height: 30,
            backgroundColor: animationData.style.secondaryColor,
            borderRadius: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          🥖 BAKERY
        </div>
        
        {/* Door */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 35,
            width: 50,
            height: 70,
            backgroundColor: isOpen ? animationData.style.secondaryColor : '#555',
            borderRadius: '8px 8px 0 0',
          }}
        />
        
        {/* Status indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            right: 10,
            padding: '4px 8px',
            backgroundColor: isOpen ? animationData.style.secondaryColor : '#EF4444',
            color: 'white',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {isOpen ? 'OPEN' : 'CLOSED'}
        </div>
      </div>
    </div>
  );
};

// Scene 1: Running to bakery (success)
const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Calculate progress (0 to 1)
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Character running from left to right
  const characterX = interpolate(progress, [0, 1], [50, 600]);
  
  // Scale character slightly when arriving
  const scale = interpolate(progress, [0.8, 1], [1, 1.2], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  // Success message opacity
  const messageOpacity = interpolate(progress, [0.85, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: animationData.style.backgroundColor }}>
      {/* City street background */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          backgroundColor: '#4B5563',
        }}
      />
      
      {/* Street lines */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 50,
            left: i * 100 - (frame * 2) % 100,
            width: 60,
            height: 4,
            backgroundColor: '#FCD34D',
          }}
        />
      ))}
      
      <Bakery x={700} y={200} isOpen={true} />
      <AppCharacter x={characterX} y={250} isHappy={true} scale={scale} />
      
      {/* Success message */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: messageOpacity,
          backgroundColor: animationData.style.secondaryColor,
          color: 'white',
          padding: '20px 40px',
          borderRadius: 12,
          fontSize: 24,
          fontWeight: 'bold',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        }}
      >
        ✓ { '{ ok: true }' }
      </div>
      
      {/* Scene description */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 20,
          color: 'white',
          fontSize: 16,
          fontFamily: animationData.style.fontFamily,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '10px 20px',
          borderRadius: 8,
          maxWidth: 400,
        }}
      >
        App runs to check if the bakery is open...
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: Bakery closed (error)
const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Error message animation
  const messageOpacity = interpolate(progress, [0.2, 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const messageY = interpolate(progress, [0.2, 0.4], [-50, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill style={{ backgroundColor: animationData.style.backgroundColor }}>
      {/* City street background */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 100,
          backgroundColor: '#4B5563',
        }}
      />
      
      <Bakery x={700} y={200} isOpen={false} />
      <AppCharacter x={600} y={250} isHappy={false} scale={1} />
      
      {/* Error message */}
      <div
        style={{
          position: 'absolute',
          top: messageY,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: messageOpacity,
          backgroundColor: '#EF4444',
          color: 'white',
          padding: '20px 40px',
          borderRadius: 12,
          fontSize: 20,
          fontWeight: 'bold',
          boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
          textAlign: 'center',
        }}
      >
        ✗ { '{ ok: false, error: "Bakery closed" }' }
      </div>
      
      {/* Scene description */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 20,
          color: 'white',
          fontSize: 16,
          fontFamily: animationData.style.fontFamily,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '10px 20px',
          borderRadius: 8,
          maxWidth: 400,
        }}
      >
        Oh no! The bakery is closed. App sends an error message.
      </div>
    </AbsoluteFill>
  );
};

// Main Video Component
const RemotionAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Convert milliseconds to frames (assuming 30 fps)
  const scene1Duration = Math.floor((animationData.scenes[0].endTime / 1000) * fps);
  const scene2Duration = Math.floor(((animationData.scenes[1].endTime - animationData.scenes[1].startTime) / 1000) * fps);
  
  // Determine which scene to show
  const showScene1 = frame < scene1Duration;
  
  return (
    <AbsoluteFill>
      {showScene1 ? <Scene1 /> : <Scene2 />}
    </AbsoluteFill>
  );
};

export { RemotionAnimation };


// src/Root.tsx
import { Composition } from 'remotion';
import { RemotionAnimation } from './RemotionAnimation';

export const RemotionRoot = () => {
  return (
    <Composition
      id="BakeryAnimation"
      component={RemotionAnimation}
      durationInFrames={1050} // 35 seconds at 30fps
      fps={30}
      width={960}
      height={540}
    />
  );
};

{
    "name": "animat",
    "version": "1.0.0",
    "description": "Remotion animation project",
    "scripts": {
        "start": "remotion studio",
        "build": "remotion render RemotionRoot out/video.mp4",
        "upgrade": "remotion upgrade"
    },
    "dependencies": {
        "@remotion/bundler": "^4.0.0",
        "@remotion/cli": "^4.0.0",
        "@remotion/renderer": "^4.0.0",
        "caniuse-lite": "^1.0.30001762",
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "remotion": "^4.0.0"
    },
    "devDependencies": {
        "@remotion/eslint-config": "^4.0.0",
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
        "eslint": "^8.0.0",
        "prettier": "^3.0.0",
        "typescript": "^5.0.0"
    }
}


// remotion.config.ts
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// tsconfig
{
    "compilerOptions": {
        "target": "ES2018",
        "lib": [
            "dom",
            "dom.iterable",
            "ES6"
        ],
        "allowJs": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "strict": true,
        "forceConsistentCasingInFileNames": true,
        "noFallthroughCasesInSwitch": true,
        "module": "esnext",
        "moduleResolution": "node",
        "resolveJsonModule": true,
        "isolatedModules": true,
        "noEmit": true,
        "jsx": "react-jsx"
    },
    "include": [
        "src"
    ]
}