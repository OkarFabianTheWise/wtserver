// This generates the HTML with canvas animation
export function generateAnimationHTML(script, duration = 5000) {
    // Simple parsing: split script into words for animation
    const words = script.split(' ').slice(0, 20); // Limit to 20 words for simplicity
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; background: #000; }
    canvas { display: block; }
  </style>
</head>
<body>
  <canvas id="canvas" width="1920" height="1080"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const duration = ${duration};
    const words = ${JSON.stringify(words)};
    let startTime = null;
    let isComplete = false;

    // STEP 1: Define animation frame drawing
    function drawFrame(time) {
      const progress = Math.min(time / duration, 1);

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw animated circles based on words
      for (let i = 0; i < Math.min(words.length, 8); i++) {
        const offset = (i * Math.PI * 2) / 8;
        const x = canvas.width / 2 + Math.cos(progress * Math.PI * 2 + offset) * 400;
        const y = canvas.height / 2 + Math.sin(progress * Math.PI * 2 + offset) * 400;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 80);
        gradient.addColorStop(0, \`hsla(\${(i * 45 + progress * 360) % 360}, 70%, 60%, 1)\`);
        gradient.addColorStop(1, \`hsla(\${(i * 45 + progress * 360) % 360}, 70%, 40%, 0)\`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 80, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center rotating shape
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(progress * Math.PI * 4);

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const radius = 60 + Math.sin(progress * Math.PI * 8) * 40;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Display words
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      const wordIndex = Math.floor(progress * words.length);
      const currentWord = words[wordIndex] || '';
      ctx.fillText(currentWord, canvas.width / 2, canvas.height - 100);

      // Progress text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(\`\${Math.round(progress * 100)}%\`, canvas.width / 2, canvas.height - 60);

      return progress >= 1;
    }

    // STEP 2: Animation loop with MediaRecorder
    function animate(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      isComplete = drawFrame(elapsed);

      if (!isComplete) {
        requestAnimationFrame(animate);
      } else {
        // Signal completion to Puppeteer
        window.animationComplete = true;
      }
    }

    // Start animation
    requestAnimationFrame(animate);

    // Expose stream for recording
    window.getCanvasStream = function(fps) {
      return canvas.captureStream(fps);
    };
  </script>
</body>
</html>
  `;
}
//# sourceMappingURL=renderer.js.map