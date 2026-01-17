// src/types.ts
export interface TutorialResult {
  tutorialText: string;
  language: string;
}

export interface AnimationScript {
  totalDuration: number;
  voiceover: {
    text: string;
    segments: VoiceoverSegment[];
  };
  scenes: Scene[];
  style: StyleConfig;
}

export interface VoiceoverSegment {
  text: string;
  startTime: number;
  endTime: number;
  sceneId: string;
}

export interface Scene {
  id: string;
  startTime: number;
  endTime: number;
  description: string;
  elements: Element[];
  transitions?: {
    in?: Transition;
    out?: Transition;
  };
}

export interface Element {
  type: 'shape' | 'text' | 'icon' | 'illustration' | 'character' | 'building' | 'status';
  x: number;
  y: number;
  animation: Animation;
  // Type-specific properties
  content?: string;
  shape?: string;
  width?: number;
  height?: number;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  align?: string;
  iconName?: string;
  size?: number;
  illustrationType?: string;
  data?: any;
  // Character-specific properties
  characterType?: 'app' | 'person' | 'generic';
  emotion?: 'neutral' | 'happy' | 'sad' | 'success' | 'error';
  action?: 'idle' | 'run' | 'walk';
  scale?: number;
  // Building-specific properties
  buildingType?: 'bakery' | 'shop' | 'generic';
  name?: string;
  status?: 'open' | 'closed';
  // Status-specific properties
  message?: string;
  statusType?: 'success' | 'error' | 'info';
  code?: string;
  [key: string]: any;
}

export interface Animation {
  type: string;
  duration: number;
  delay: number;
  easing?: string;
  direction?: string;
  distance?: number;
  startTime?: number;
  endTime?: number;
  [key: string]: any;
}

export interface Transition {
  type: string;
  duration: number;
}

export interface StyleConfig {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  theme: string;
}

export const __types = {};

