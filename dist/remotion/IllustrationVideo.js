import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
export const IllustrationVideo = ({ animationScript }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    if (!animationScript) {
        return _jsx(AbsoluteFill, { style: { backgroundColor: '#ffffff' } });
    }
    // Convert frame to milliseconds
    const currentTime = (frame / fps) * 1000;
    // Find current scenes
    const currentScenes = animationScript.scenes.filter(scene => currentTime >= scene.startTime && currentTime < scene.endTime);
    return (_jsx(AbsoluteFill, { style: { backgroundColor: animationScript.style.backgroundColor }, children: currentScenes.map(scene => (_jsx(SceneRenderer, { scene: scene, currentTime: currentTime }, scene.id))) }));
};
// SceneRenderer component
const SceneRenderer = ({ scene, currentTime }) => {
    const sceneTime = currentTime - scene.startTime;
    return (_jsx(AbsoluteFill, { children: scene.elements.map(element => (_jsx(ElementRenderer, { element: element, sceneTime: sceneTime, sceneDuration: scene.endTime - scene.startTime }, element.id))) }));
};
// ElementRenderer component
const ElementRenderer = ({ element, sceneTime, sceneDuration }) => {
    const { animation } = element;
    // Calculate animation progress
    let progress = 0;
    const animStartTime = animation.startTime || 0;
    const animEndTime = animation.endTime || animation.duration || sceneDuration;
    if (sceneTime >= animStartTime && sceneTime <= animEndTime) {
        progress = (sceneTime - animStartTime) / (animEndTime - animStartTime);
    }
    else if (sceneTime > animEndTime) {
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
            return _jsx(TextElement, { element: element, animatedProps: animatedProps });
        case 'shape':
            return _jsx(ShapeElement, { element: element, animatedProps: animatedProps });
        case 'icon':
            return _jsx(IconElement, { element: element, animatedProps: animatedProps });
        case 'character':
            return _jsx(CharacterElement, { element: element, animatedProps: animatedProps, sceneTime: sceneTime });
        case 'building':
            return _jsx(BuildingElement, { element: element, animatedProps: animatedProps });
        case 'status':
            return _jsx(StatusElement, { element: element, animatedProps: animatedProps });
        case 'illustration':
            return _jsx(IllustrationElement, { element: element, animatedProps: animatedProps });
        default:
            return null;
    }
};
// Helper functions
const applyEasing = (progress, easing) => {
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
const calculateAnimatedProperties = (element, animation, progress) => {
    const props = {};
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
const TextElement = ({ element, animatedProps }) => (_jsx("div", { style: {
        position: 'absolute',
        left: element.x,
        top: element.y,
        fontSize: element.fontSize || 24,
        fontFamily: 'Arial, sans-serif',
        fontWeight: element.fontWeight || 'normal',
        color: element.color || '#000000',
        textAlign: element.align || 'left',
        ...animatedProps,
    }, children: element.content }));
const ShapeElement = ({ element, animatedProps }) => {
    const { shape } = element;
    let shapeElement;
    switch (shape) {
        case 'circle':
            shapeElement = (_jsx("div", { style: {
                    width: element.width || 100,
                    height: element.height || 100,
                    borderRadius: '50%',
                    backgroundColor: element.color || '#cccccc',
                    ...animatedProps,
                } }));
            break;
        case 'rectangle':
            shapeElement = (_jsx("div", { style: {
                    width: element.width || 100,
                    height: element.height || 100,
                    backgroundColor: element.color || '#cccccc',
                    ...animatedProps,
                } }));
            break;
        default:
            shapeElement = null;
    }
    return (_jsx("div", { style: {
            position: 'absolute',
            left: element.x,
            top: element.y,
        }, children: shapeElement }));
};
const IconElement = ({ element, animatedProps }) => (_jsx("div", { style: {
        position: 'absolute',
        left: element.x,
        top: element.y,
        fontSize: element.size || 48,
        color: element.color || '#000000',
        ...animatedProps,
    }, children: element.iconName || '🔧' }));
// Character Element - Animated character with emotions
const CharacterElement = ({ element, animatedProps, sceneTime }) => {
    const { characterType, emotion, action, scale = 1 } = element;
    const frame = useCurrentFrame();
    // Bobbing animation for idle characters
    const bob = action === 'idle' ? Math.sin(frame / 8) * 2 : 0;
    // Running animation
    const runOffset = action === 'run' ? Math.sin(frame / 3) * 5 : 0;
    return (_jsx("div", { style: {
            position: 'absolute',
            left: element.x,
            top: element.y + bob + runOffset,
            transform: `scale(${scale})`,
            ...animatedProps,
        }, children: characterType === 'app' ? (_jsx(AppCharacter, { emotion: emotion, action: action })) : characterType === 'person' ? (_jsx(PersonCharacter, { emotion: emotion, action: action })) : (_jsx(GenericCharacter, { emotion: emotion, action: action })) }));
};
// Building Element
const BuildingElement = ({ element, animatedProps }) => {
    const { buildingType, name, status } = element;
    return (_jsx("div", { style: {
            position: 'absolute',
            left: element.x,
            top: element.y,
            ...animatedProps,
        }, children: buildingType === 'bakery' ? (_jsx(BakeryBuilding, { name: name, status: status })) : buildingType === 'shop' ? (_jsx(GenericShop, { name: name, status: status })) : (_jsx(GenericBuilding, { name: name, status: status })) }));
};
// Status Message Element
const StatusElement = ({ element, animatedProps }) => {
    const { message, statusType, code } = element;
    const bgColor = statusType === 'success' ? '#10B981' : statusType === 'error' ? '#EF4444' : '#6B7280';
    const icon = statusType === 'success' ? '✓' : statusType === 'error' ? '✗' : 'ℹ';
    return (_jsxs("div", { style: {
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
        }, children: [_jsx("span", { style: { fontSize: '24px' }, children: icon }), _jsxs("div", { children: [_jsx("div", { children: message }), code && _jsx("div", { style: { fontSize: '14px', opacity: 0.9, marginTop: '4px' }, children: code })] })] }));
};
const IllustrationElement = ({ element, animatedProps }) => {
    const { illustrationType, data } = element;
    switch (illustrationType) {
        case 'flowchart':
            return _jsx(FlowchartIllustration, { data: data, animatedProps: animatedProps });
        case 'diagram':
            return _jsx(DiagramIllustration, { data: data, animatedProps: animatedProps });
        case 'graph':
            return _jsx(GraphIllustration, { data: data, animatedProps: animatedProps });
        case 'infographic':
            return _jsx(InfographicIllustration, { data: data, animatedProps: animatedProps });
        default:
            return (_jsx("div", { style: {
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
                }, children: illustrationType || 'Illustration' }));
    }
};
// Illustration Components
const FlowchartIllustration = ({ data, animatedProps }) => {
    if (!data || !data.nodes || !data.edges)
        return null;
    return (_jsxs("div", { style: { position: 'relative', ...animatedProps }, children: [data.nodes.map((node) => (_jsx("div", { style: {
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
                }, children: node.label }, node.id))), data.edges.map((edge, index) => (_jsxs("svg", { style: {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                }, children: [_jsx("line", { x1: data.nodes.find((n) => n.id === edge.from)?.x + 40 || 0, y1: data.nodes.find((n) => n.id === edge.from)?.y + 25 || 0, x2: data.nodes.find((n) => n.id === edge.to)?.x + 40 || 0, y2: data.nodes.find((n) => n.id === edge.to)?.y + 25 || 0, stroke: "#333", strokeWidth: "2", markerEnd: "url(#arrowhead)" }), _jsx("defs", { children: _jsx("marker", { id: "arrowhead", markerWidth: "10", markerHeight: "7", refX: "9", refY: "3.5", orient: "auto", children: _jsx("polygon", { points: "0 0, 10 3.5, 0 7", fill: "#333" }) }) })] }, index)))] }));
};
const DiagramIllustration = ({ data, animatedProps }) => (_jsxs("div", { style: {
        position: 'absolute',
        backgroundColor: '#e0e0e0',
        border: '2px solid #999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666',
        ...animatedProps,
    }, children: ["Diagram: ", data?.title || 'Network Diagram'] }));
const GraphIllustration = ({ data, animatedProps }) => (_jsxs("div", { style: {
        position: 'absolute',
        backgroundColor: '#f0f8ff',
        border: '2px solid #999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666',
        ...animatedProps,
    }, children: ["Graph: ", data?.title || 'Data Visualization'] }));
const InfographicIllustration = ({ data, animatedProps }) => (_jsxs("div", { style: {
        position: 'absolute',
        backgroundColor: '#fffacd',
        border: '2px solid #999',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#666',
        ...animatedProps,
    }, children: ["Infographic: ", data?.title || 'Information Graphic'] }));
// Character Components
const AppCharacter = ({ emotion = 'neutral', action = 'idle' }) => {
    const isHappy = emotion === 'happy' || emotion === 'success';
    const isSad = emotion === 'sad' || emotion === 'error';
    return (_jsxs("div", { style: { position: 'relative' }, children: [_jsxs("div", { style: {
                    width: 60,
                    height: 80,
                    backgroundColor: '#3B82F6',
                    borderRadius: '30px 30px 20px 20px',
                    position: 'relative',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                }, children: [_jsx("div", { style: {
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
                        }, children: isHappy ? '✓' : isSad ? '✗' : '○' }), _jsx("div", { style: {
                            position: 'absolute',
                            top: 30,
                            left: -8,
                            width: 8,
                            height: 25,
                            backgroundColor: '#3B82F6',
                            borderRadius: 4,
                            transform: `rotate(${isHappy ? -20 : isSad ? 15 : 0}deg)`,
                        } }), _jsx("div", { style: {
                            position: 'absolute',
                            top: 30,
                            right: -8,
                            width: 8,
                            height: 25,
                            backgroundColor: '#3B82F6',
                            borderRadius: 4,
                            transform: `rotate(${isHappy ? 20 : isSad ? -15 : 0}deg)`,
                        } }), _jsx("div", { style: {
                            position: 'absolute',
                            bottom: -18,
                            left: 12,
                            width: 8,
                            height: 18,
                            backgroundColor: '#3B82F6',
                            borderRadius: 4,
                        } }), _jsx("div", { style: {
                            position: 'absolute',
                            bottom: -18,
                            right: 12,
                            width: 8,
                            height: 18,
                            backgroundColor: '#3B82F6',
                            borderRadius: 4,
                        } })] }), action === 'run' && (_jsx("div", { style: { position: 'absolute', top: 85, left: -10 }, children: [...Array(3)].map((_, i) => (_jsx("div", { style: {
                        position: 'absolute',
                        left: i * 15,
                        width: 8,
                        height: 4,
                        backgroundColor: '#9CA3AF',
                        borderRadius: 2,
                        opacity: 0.6,
                    } }, i))) }))] }));
};
const PersonCharacter = ({ emotion = 'neutral', action = 'idle' }) => {
    const isHappy = emotion === 'happy' || emotion === 'success';
    const isSad = emotion === 'sad' || emotion === 'error';
    return (_jsx("div", { style: { position: 'relative' }, children: _jsxs("div", { style: {
                width: 50,
                height: 70,
                backgroundColor: '#FCD34D',
                borderRadius: '25px 25px 15px 15px',
                position: 'relative',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }, children: [_jsxs("div", { style: { position: 'absolute', top: 10, left: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: '12px' }, children: [_jsx("div", { style: {
                                        width: 6,
                                        height: isHappy ? 6 : 4,
                                        backgroundColor: 'black',
                                        borderRadius: '50%',
                                    } }), _jsx("div", { style: {
                                        width: 6,
                                        height: isHappy ? 6 : 4,
                                        backgroundColor: 'black',
                                        borderRadius: '50%',
                                    } })] }), _jsx("div", { style: {
                                marginTop: 6,
                                marginLeft: 3,
                                width: 16,
                                height: isHappy ? 8 : 6,
                                borderBottom: isHappy ? '2px solid black' : '2px solid #666',
                                borderRadius: isHappy ? '0 0 8px 8px' : '8px 8px 0 0',
                            } })] }), _jsx("div", { style: {
                        position: 'absolute',
                        top: 25,
                        left: -6,
                        width: 6,
                        height: 20,
                        backgroundColor: '#FCD34D',
                        borderRadius: 3,
                        transform: `rotate(${isHappy ? -15 : isSad ? 10 : 0}deg)`,
                    } }), _jsx("div", { style: {
                        position: 'absolute',
                        top: 25,
                        right: -6,
                        width: 6,
                        height: 20,
                        backgroundColor: '#FCD34D',
                        borderRadius: 3,
                        transform: `rotate(${isHappy ? 15 : isSad ? -10 : 0}deg)`,
                    } }), _jsx("div", { style: {
                        position: 'absolute',
                        bottom: -15,
                        left: 10,
                        width: 6,
                        height: 15,
                        backgroundColor: '#FCD34D',
                        borderRadius: 3,
                    } }), _jsx("div", { style: {
                        position: 'absolute',
                        bottom: -15,
                        right: 10,
                        width: 6,
                        height: 15,
                        backgroundColor: '#FCD34D',
                        borderRadius: 3,
                    } })] }) }));
};
const GenericCharacter = ({ emotion = 'neutral', action = 'idle' }) => {
    return (_jsx("div", { style: {
            width: 60,
            height: 80,
            backgroundColor: '#6B7280',
            borderRadius: '30px 30px 20px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
        }, children: "\uD83D\uDC64" }));
};
// Building Components
const BakeryBuilding = ({ name = 'Bakery', status = 'open' }) => {
    const isOpen = status === 'open';
    return (_jsx("div", { style: { position: 'relative' }, children: _jsxs("div", { style: {
                width: 120,
                height: 150,
                backgroundColor: '#8B4513',
                borderRadius: '8px 8px 0 0',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }, children: [_jsx("div", { style: {
                        position: 'absolute',
                        top: -30,
                        left: -10,
                        width: 0,
                        height: 0,
                        borderLeft: '70px solid transparent',
                        borderRight: '70px solid transparent',
                        borderBottom: `30px solid ${isOpen ? '#F59E0B' : '#6B7280'}`,
                    } }), _jsxs("div", { style: {
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
                    }, children: ["\uD83E\uDD56 ", name] }), _jsx("div", { style: {
                        position: 'absolute',
                        bottom: 0,
                        left: 35,
                        width: 50,
                        height: 70,
                        backgroundColor: isOpen ? '#10B981' : '#555',
                        borderRadius: '8px 8px 0 0',
                    } }), _jsx("div", { style: {
                        position: 'absolute',
                        bottom: 80,
                        right: 10,
                        padding: '4px 8px',
                        backgroundColor: isOpen ? '#10B981' : '#EF4444',
                        color: 'white',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 'bold',
                    }, children: isOpen ? 'OPEN' : 'CLOSED' })] }) }));
};
const GenericShop = ({ name = 'Shop', status = 'open' }) => {
    const isOpen = status === 'open';
    return (_jsx("div", { style: { position: 'relative' }, children: _jsxs("div", { style: {
                width: 100,
                height: 120,
                backgroundColor: '#6B7280',
                borderRadius: '6px 6px 0 0',
                position: 'relative',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }, children: [_jsx("div", { style: {
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
                    }, children: name }), _jsx("div", { style: {
                        position: 'absolute',
                        bottom: 0,
                        left: 30,
                        width: 40,
                        height: 50,
                        backgroundColor: isOpen ? '#10B981' : '#555',
                        borderRadius: '6px 6px 0 0',
                    } })] }) }));
};
const GenericBuilding = ({ name = 'Building', status = 'open' }) => {
    return (_jsx("div", { style: {
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
        }, children: name }));
};
//# sourceMappingURL=IllustrationVideo.js.map