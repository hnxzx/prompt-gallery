// 蓝色流体动画背景 — 基于 Three.js shader
import * as THREE from 'three';

export function startBackground() {
  const canvas = document.getElementById('gloria-ocean');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const vertexShader = `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;

    // 简单的 2D noise
    vec2 hash(vec2 p) {
      p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
            dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
        mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
            dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 p = uv * 3.0;

      float t = uTime * 0.15;

      // 多层噪声叠加形成流体
      float f1 = fbm(p + vec2(t, t * 0.7));
      float f2 = fbm(p * 1.5 + vec2(-t * 0.5, t * 0.3));
      float f = f1 * 0.6 + f2 * 0.4;

      // 深蓝色调色板
      vec3 dark = vec3(0.02, 0.05, 0.12);
      vec3 mid = vec3(0.08, 0.2, 0.45);
      vec3 light = vec3(0.2, 0.5, 0.8);
      vec3 glow = vec3(0.4, 0.7, 1.0);

      vec3 color = mix(dark, mid, smoothstep(0.2, 0.6, f));
      color = mix(color, light, smoothstep(0.5, 0.8, f));
      color = mix(color, glow, smoothstep(0.75, 1.0, f) * 0.5);

      // 顶部稍微亮一点
      color += vec3(0.02, 0.04, 0.08) * (1.0 - uv.y);

      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const uniforms = {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2() },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    uniforms.uResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  }

  resize();
  window.addEventListener('resize', resize);

  const start = performance.now();
  let rafId;

  function animate() {
    const elapsed = (performance.now() - start) / 1000;
    uniforms.uTime.value = elapsed;
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  }

  animate();

  // 暂停/继续控制
  const container = document.querySelector('.ocean-background');
  if (container) {
    container.dataset.state = 'ready';
  }

  // 页面不可见时暂停
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      animate();
    }
  });
}
