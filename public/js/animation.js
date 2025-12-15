console.log("animation.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const LINE_COUNT = 26;
  const lines = [];

  // 🎨 YOUR COLOR PALETTE (soft alpha applied)
  const colors = [
    "rgba(1, 58, 99, 0.28)",   // Yale Blue
    "rgba(1, 73, 124, 0.26)",
    "rgba(1, 79, 134, 0.25)",
    "rgba(42, 111, 151, 0.24)",
    "rgba(44, 125, 160, 0.23)",
    "rgba(70, 143, 175, 0.22)",
    "rgba(97, 165, 194, 0.22)",
    "rgba(137, 194, 217, 0.20)",
    "rgba(169, 214, 229, 0.18)"
  ];

  for (let i = 0; i < LINE_COUNT; i++) {
    lines.push({
      offset: Math.random() * canvas.height,
      speed: 0.15 + Math.random() * 0.35,
      amp: 18 + Math.random() * 45,
      freq: 0.002 + Math.random() * 0.003,
      width: 0.6 + Math.random() * 1.8,
      dotted: Math.random() > 0.65,
      color: colors[i % colors.length]
    });
  }

  function draw() {
    // 🌫 soft fade (keeps animation smooth & visible)
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const l of lines) {
      ctx.beginPath();
      ctx.lineWidth = l.width;
      ctx.strokeStyle = l.color;
      ctx.setLineDash(l.dotted ? [6, 14] : []);

      for (let x = -60; x <= canvas.width + 60; x += 10) {
        const y =
          l.offset +
          Math.sin(x * l.freq + performance.now() * 0.001 * l.speed) *
            l.amp;
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  draw();
});
