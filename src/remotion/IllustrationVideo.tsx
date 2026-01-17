import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { AnimationScript, Scene, Element, Animation } from '../types.js';

interface IllustrationVideoProps extends Record<string, unknown> {
  animationScript: AnimationScript;
}

export const IllustrationVideo: React.FC<IllustrationVideoProps> = ({
  animationScript
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  if (!animationScript) {
    return <AbsoluteFill style={{ backgroundColor: '#ffffff' }} />;
  }

  // Convert frame to milliseconds
  const currentTime = (frame / fps) * 1000;

  // Find current scenes
  const currentScenes = animationScript.scenes.filter(scene =>
    currentTime >= scene.startTime && currentTime < scene.endTime
  );

  return (
    <AbsoluteFill style={{ backgroundColor: animationScript.style.backgroundColor }}>
      {currentScenes.map(scene => (
        <SceneRenderer key={scene.id} scene={scene} currentTime={currentTime} />
      ))}
    </AbsoluteFill>
  );
};

// SceneRenderer component
const SceneRenderer: React.FC<{ scene: Scene; currentTime: number }> = ({ scene, currentTime }) => {
  const sceneTime = currentTime - scene.startTime;

  return (
    <AbsoluteFill>
      {scene.elements.map(element => (
        <ElementRenderer
          key={element.id}
          element={element}
          sceneTime={sceneTime}
          sceneDuration={scene.endTime - scene.startTime}
        />
      ))}
    </AbsoluteFill>
  );
};

// ElementRenderer component
const ElementRenderer: React.FC<{
  element: Element;
  sceneTime: number;
  sceneDuration: number;
}> = ({ element, sceneTime, sceneDuration }) => {
  const { animation } = element;

  // Calculate animation progress
  let progress = 0;
  const animStartTime = animation.startTime || 0;
  const animEndTime = animation.endTime || animation.duration || sceneDuration;

  if (sceneTime >= animStartTime && sceneTime <= animEndTime) {
    progress = (sceneTime - animStartTime) / (animEndTime - animStartTime);
  } else if (sceneTime > animEndTime) {
    progress = 1;
  }

  // Apply easing
  const easing = animation.easing || 'easeOut';
  const easedProgress = applyEasing(progress, easing);

  // Calculate animated properties
  const animatedProps = calculateAnimatedProperties(element, animation, easedProgress);

  // Render based on element type
  switch (element.type) {
    case 'text':
      return <TextElement element={element} animatedProps={animatedProps} />;
    case 'shape':
      return <ShapeElement element={element} animatedProps={animatedProps} />;
    case 'icon':
      return <IconElement element={element} animatedProps={animatedProps} />;
    case 'character':
      return <CharacterElement element={element} animatedProps={animatedProps} sceneTime={sceneTime} />;
    case 'building':
      return <BuildingElement element={element} animatedProps={animatedProps} />;
    case 'status':
      return <StatusElement element={element} animatedProps={animatedProps} />;
    case 'illustration':
      return <IllustrationElement element={element} animatedProps={animatedProps} />;
    default:
      return null;
  }
};

// Helper functions
const applyEasing = (progress: number, easing: string): number => {
  switch (easing) {
    case 'easeIn':
      return progress * progress;
    case 'easeOut':
      return 1 - Math.pow(1 - progress, 2);
    case 'easeInOut':
      return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    default:
      return progress;
  }
};

const calculateAnimatedProperties = (
  element: Element,
  animation: Animation,
  progress: number
): any => {
  const props: any = {};

  // Handle different animation types
  switch (animation.type) {
    case 'fadeIn':
      props.opacity = progress;
      break;
    case 'slideIn':
      const direction = animation.direction || 'left';
      const distance = animation.distance || 100;
      switch (direction) {
        case 'left':
          props.transform = `translateX(${distance * (1 - progress)}px)`;
          break;
        case 'right':
          props.transform = `translateX(${-distance * (1 - progress)}px)`;
          break;
        case 'up':
          props.transform = `translateY(${distance * (1 - progress)}px)`;
          break;
        case 'down':
          props.transform = `translateY(${-distance * (1 - progress)}px)`;
          break;
      }
      break;
    case 'scaleIn':
      const scale = 0.5 + (0.5 * progress);
      props.transform = `scale(${scale})`;
      break;
    case 'bounce':
      const bounceProgress = 1 - Math.abs(Math.sin(progress * Math.PI * 2)) * (1 - progress);
      props.transform = `translateY(${-20 * bounceProgress}px)`;
      break;
  }

  return props;
};

// Element components
const TextElement: React.FC<{ element: Element; animatedProps: any }> = ({ element, animatedProps }) => (
  <div
    style={{
      position: 'absolute',
      left: element.x,
      top: element.y,
      fontSize: element.fontSize || 24,
      fontFamily: 'Arial, sans-serif',
      fontWeight: element.fontWeight || 'normal',
      color: element.color || '#000000',
      textAlign: element.align || 'left',
      ...animatedProps,
    }}
  >
    {element.content}
  </div>
);

const ShapeElement: React.FC<{ element: Element; animatedProps: any }> = ({ element, animatedProps }) => {
  const { shape } = element;

  let shapeElement;
  switch (shape) {
    case 'circle':
      shapeElement = (
        <div
          style={{
            width: element.width || 100,
            height: element.height || 100,
            borderRadius: '50%',
            backgroundColor: element.color || '#cccccc',
            ...animatedProps,
          }}
        />
      );
      break;
    case 'rectangle':
      shapeElement = (
        <div
          style={{
            width: element.width || 100,
            height: element.height || 100,
            backgroundColor: element.color || '#cccccc',
            ...animatedProps,
          }}
        />
      );
      break;
    default:
      shapeElement = null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
      }}
    >
      {shapeElement}
    </div>
  );
};

const IconElement: React.FC<{ element: Element; animatedProps: any }> = ({ element, animatedProps }) => (
  <div
    style={{
      position: 'absolute',
      left: element.x,
      top: element.y,
      fontSize: element.size || 48,
      color: element.color || '#000000',
      ...animatedProps,
    }}
  >
    {/* Placeholder for icon - in real implementation, use an icon library */}
    {element.iconName || '🔧'}
  </div>
);

// Character Element - Animated character with emotions
const CharacterElement: React.FC<{ element: Element; animatedProps: any; sceneTime: number }> = ({ 
  element, 
  animatedProps,
  sceneTime 
}) => {
  const { characterType, emotion, action, scale = 1 } = element;
  const frame = useCurrentFrame();
  
  // Bobbing animation for idle characters
  const bob = action === 'idle' ? Math.sin(frame / 8) * 2 : 0;
  
  // Running animation
  const runOffset = action === 'run' ? Math.sin(frame / 3) * 5 : 0;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y + bob + runOffset,
        transform: `scale(${scale})`,
        ...animatedProps,
      }}
    >
      {characterType === 'app' ? (
        <AppCharacter emotion={emotion} action={action} />
      ) : characterType === 'person' ? (
        <PersonCharacter emotion={emotion} action={action} />
      ) : (
        <GenericCharacter emotion={emotion} action={action} />
      )}
    </div>
  );
};

// Building Element
const BuildingElement: React.FC<{ element: Element; animatedProps: any }> = ({ element, animatedProps }) => {
  const { buildingType, name, status } = element;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        ...animatedProps,
      }}
    >
      {buildingType === 'bakery' ? (
        <BakeryBuilding name={name} status={status} />
      ) : buildingType === 'shop' ? (
        <GenericShop name={name} status={status} />
      ) : (
        <GenericBuilding name={name} status={status} />
      )}
    </div>
  );
};

// Status Message Element
const StatusElement: React.FC<{ element: Element; animatedProps: any }> = ({ element, animatedProps }) => {
  const { message, statusType, code } = element;
  
  const bgColor = statusType === 'success' ? '#10B981' : statusType === 'error' ? '#EF4444' : '#6B7280';
  const icon = statusType === 'success' ? '✓' : statusType === 'error' ? '✗' : 'ℹ';
  
  return (
    <div
      style={{
        position: 'absolute',
        left: element.x,
        top: element.y,
        backgroundColor: bgColor,
        color: 'white',
        padding: '16px 24px',
        borderRadius: 12,
        fontSize: element.fontSize || 20,
        fontWeight: 'bold',
        boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...animatedProps,
      }}
    >
      <span style={{ fontSize: '24px' }}>{icon}</span>
      <div>
        <div>{message}</div>
        {code && <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>{code}</div>}
      </div>
    </div>
  );
};

const IllustrationElement: React.FC<{ element: Element; animatedProps: any }> = ({ element, animatedProps }) => {
  const { illustrationType, data } = element;

  switch (illustrationType) {
    case 'flowchart':
      return <FlowchartIllustration data={data} animatedProps={animatedProps} />;
    case 'diagram':
      return <DiagramIllustration data={data} animatedProps={animatedProps} />;
    case 'graph':
      return <GraphIllustration data={data} animatedProps={animatedProps} />;
    case 'infographic':
      return <InfographicIllustration data={data} animatedProps={animatedProps} />;
    default:
      return (
        <div
          style={{
            position: 'absolute',
            left: element.x,
            top: element.y,
            width: element.width || 200,
            height: element.height || 200,
            backgroundColor: '#f0f0f0',
            border: '2px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#666',
            ...animatedProps,
          }}
        >
          {illustrationType || 'Illustration'}
        </div>
      );
  }
};

// Illustration Components
const FlowchartIllustration: React.FC<{ data: any; animatedProps: any }> = ({ data, animatedProps }) => {
  if (!data || !data.nodes || !data.edges) return null;

  return (
    <div style={{ position: 'relative', ...animatedProps }}>
      {data.nodes.map((node: any) => (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            padding: '10px',
            backgroundColor: '#ffffff',
            border: '2px solid #333',
            borderRadius: '5px',
            fontSize: '14px',
            textAlign: 'center',
            minWidth: '80px',
          }}
        >
          {node.label}
        </div>
      ))}
      {data.edges.map((edge: any, index: number) => (
        <svg
          key={index}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <line
            x1={data.nodes.find((n: any) => n.id === edge.from)?.x + 40 || 0}
            y1={data.nodes.find((n: any) => n.id === edge.from)?.y + 25 || 0}
            x2={data.nodes.find((n: any) => n.id === edge.to)?.x + 40 || 0}
            y2={data.nodes.find((n: any) => n.id === edge.to)?.y + 25 || 0}
            stroke="#333"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#333" />
            </marker>
          </defs>
        </svg>
      ))}
    </div>
  );
};

const DiagramIllustration: React.FC<{ data: any; animatedProps: any }> = ({ data, animatedProps }) => (
  <div
    style={{
      position: 'absolute',
      backgroundColor: '#e0e0e0',
      border: '2px solid #999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      color: '#666',
      ...animatedProps,
    }}
  >
    Diagram: {data?.title || 'Network Diagram'}
  </div>
);

const GraphIllustration: React.FC<{ data: any; animatedProps: any }> = ({ data, animatedProps }) => (
  <div
    style={{
      position: 'absolute',
      backgroundColor: '#f0f8ff',
      border: '2px solid #999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      color: '#666',
      ...animatedProps,
    }}
  >
    Graph: {data?.title || 'Data Visualization'}
  </div>
);

const InfographicIllustration: React.FC<{ data: any; animatedProps: any }> = ({ data, animatedProps }) => (
  <div
    style={{
      position: 'absolute',
      backgroundColor: '#fffacd',
      border: '2px solid #999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      color: '#666',
      ...animatedProps,
    }}
  >
    Infographic: {data?.title || 'Information Graphic'}
  </div>
);

// Character Components
const AppCharacter: React.FC<{ emotion?: string; action?: string }> = ({ emotion = 'neutral', action = 'idle' }) => {
  const isHappy = emotion === 'happy' || emotion === 'success';
  const isSad = emotion === 'sad' || emotion === 'error';
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Body */}
      <div
        style={{
          width: 60,
          height: 80,
          backgroundColor: '#3B82F6',
          borderRadius: '30px 30px 20px 20px',
          position: 'relative',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Screen/App Interface */}
        <div
          style={{
            position: 'absolute',
            top: 15,
            left: 10,
            width: 40,
            height: 50,
            backgroundColor: '#1F2937',
            borderRadius: 8,
            border: '2px solid #6B7280',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: isHappy ? '#10B981' : isSad ? '#EF4444' : '#FFFFFF',
          }}
        >
          {isHappy ? '✓' : isSad ? '✗' : '○'}
        </div>
        
        {/* Arms */}
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: -8,
            width: 8,
            height: 25,
            backgroundColor: '#3B82F6',
            borderRadius: 4,
            transform: `rotate(${isHappy ? -20 : isSad ? 15 : 0}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            right: -8,
            width: 8,
            height: 25,
            backgroundColor: '#3B82F6',
            borderRadius: 4,
            transform: `rotate(${isHappy ? 20 : isSad ? -15 : 0}deg)`,
          }}
        />
        
        {/* Legs */}
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            left: 12,
            width: 8,
            height: 18,
            backgroundColor: '#3B82F6',
            borderRadius: 4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            right: 12,
            width: 8,
            height: 18,
            backgroundColor: '#3B82F6',
            borderRadius: 4,
          }}
        />
      </div>
      
      {/* Action lines for running */}
      {action === 'run' && (
        <div style={{ position: 'absolute', top: 85, left: -10 }}>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: i * 15,
                width: 8,
                height: 4,
                backgroundColor: '#9CA3AF',
                borderRadius: 2,
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const PersonCharacter: React.FC<{ emotion?: string; action?: string }> = ({ emotion = 'neutral', action = 'idle' }) => {
  const isHappy = emotion === 'happy' || emotion === 'success';
  const isSad = emotion === 'sad' || emotion === 'error';
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Body */}
      <div
        style={{
          width: 50,
          height: 70,
          backgroundColor: '#FCD34D',
          borderRadius: '25px 25px 15px 15px',
          position: 'relative',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Face */}
        <div style={{ position: 'absolute', top: 10, left: 10 }}>
          {/* Eyes */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div
              style={{
                width: 6,
                height: isHappy ? 6 : 4,
                backgroundColor: 'black',
                borderRadius: '50%',
              }}
            />
            <div
              style={{
                width: 6,
                height: isHappy ? 6 : 4,
                backgroundColor: 'black',
                borderRadius: '50%',
              }}
            />
          </div>
          {/* Mouth */}
          <div
            style={{
              marginTop: 6,
              marginLeft: 3,
              width: 16,
              height: isHappy ? 8 : 6,
              borderBottom: isHappy ? '2px solid black' : '2px solid #666',
              borderRadius: isHappy ? '0 0 8px 8px' : '8px 8px 0 0',
            }}
          />
        </div>
        
        {/* Arms */}
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: -6,
            width: 6,
            height: 20,
            backgroundColor: '#FCD34D',
            borderRadius: 3,
            transform: `rotate(${isHappy ? -15 : isSad ? 10 : 0}deg)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 25,
            right: -6,
            width: 6,
            height: 20,
            backgroundColor: '#FCD34D',
            borderRadius: 3,
            transform: `rotate(${isHappy ? 15 : isSad ? -10 : 0}deg)`,
          }}
        />
        
        {/* Legs */}
        <div
          style={{
            position: 'absolute',
            bottom: -15,
            left: 10,
            width: 6,
            height: 15,
            backgroundColor: '#FCD34D',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -15,
            right: 10,
            width: 6,
            height: 15,
            backgroundColor: '#FCD34D',
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
};

const GenericCharacter: React.FC<{ emotion?: string; action?: string }> = ({ emotion = 'neutral', action = 'idle' }) => {
  return (
    <div
      style={{
        width: 60,
        height: 80,
        backgroundColor: '#6B7280',
        borderRadius: '30px 30px 20px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: 'white',
      }}
    >
      👤
    </div>
  );
};

// Building Components
const BakeryBuilding: React.FC<{ name?: string; status?: string }> = ({ name = 'Bakery', status = 'open' }) => {
  const isOpen = status === 'open';
  
  return (
    <div style={{ position: 'relative' }}>
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
            borderBottom: `30px solid ${isOpen ? '#F59E0B' : '#6B7280'}`,
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
            backgroundColor: isOpen ? '#10B981' : '#EF4444',
            borderRadius: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 14,
          }}
        >
          🥖 {name}
        </div>
        
        {/* Door */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 35,
            width: 50,
            height: 70,
            backgroundColor: isOpen ? '#10B981' : '#555',
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
            backgroundColor: isOpen ? '#10B981' : '#EF4444',
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

const GenericShop: React.FC<{ name?: string; status?: string }> = ({ name = 'Shop', status = 'open' }) => {
  const isOpen = status === 'open';
  
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          width: 100,
          height: 120,
          backgroundColor: '#6B7280',
          borderRadius: '6px 6px 0 0',
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {/* Sign */}
        <div
          style={{
            position: 'absolute',
            top: 15,
            left: 10,
            width: 80,
            height: 25,
            backgroundColor: isOpen ? '#10B981' : '#EF4444',
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: 12,
          }}
        >
          {name}
        </div>
        
        {/* Door */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 30,
            width: 40,
            height: 50,
            backgroundColor: isOpen ? '#10B981' : '#555',
            borderRadius: '6px 6px 0 0',
          }}
        />
      </div>
    </div>
  );
};

const GenericBuilding: React.FC<{ name?: string; status?: string }> = ({ name = 'Building', status = 'open' }) => {
  return (
    <div
      style={{
        width: 100,
        height: 120,
        backgroundColor: '#4B5563',
        borderRadius: '6px 6px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        color: 'white',
        fontWeight: 'bold',
      }}
    >
      {name}
    </div>
  );
};