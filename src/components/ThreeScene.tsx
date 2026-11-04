"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/**
 * A slow, decorative 3D scene for the auth aside: a wireframe shape
 * drifting among particles, tilting gently toward the mouse. It is
 * decoration only (the aside is already aria-hidden), so it never
 * carries information. Reduced motion gets one still frame, no loop;
 * a device without WebGL gets nothing at all — the text stays.
 */
export default function ThreeScene() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;

    const group = new THREE.Group();
    const shape = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.3, 1),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.9, wireframe: true }),
    );
    group.add(shape);
    const points = new THREE.Points(
      starGeometry(180),
      new THREE.PointsMaterial({ color: 0x93c5fd, opacity: 0.8, size: 0.03, transparent: true }),
    );
    group.add(points);
    // Tilt and spin live on separate groups so the mouse tilt never
    // fights the continuous rotation.
    const tilt = new THREE.Group();
    tilt.add(group);
    scene.add(tilt);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width === 0 || height === 0) return;
      renderer!.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    // Mouse tilt, eased toward the pointer so it never jumps.
    let targetX = 0;
    let targetY = 0;
    const onMouse = (event: MouseEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 0.6;
      targetY = (event.clientY / window.innerHeight - 0.5) * 0.6;
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    if (!reduced) window.addEventListener("mousemove", onMouse);
    const clock = new THREE.Clock();
    const draw = () => {
      const delta = clock.getDelta();
      group.rotation.y += delta * 0.15;
      points.rotation.y -= delta * 0.05;
      tilt.rotation.x += (targetY - tilt.rotation.x) * 0.03;
      tilt.rotation.y += (targetX - tilt.rotation.y) * 0.03;
      renderer!.render(scene, camera);
    };
    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };
    if (reduced) draw();
    else frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMouse);
      observer.disconnect();
      shape.geometry.dispose();
      (shape.material as THREE.Material).dispose();
      points.geometry.dispose();
      (points.material as THREE.Material).dispose();
      renderer!.dispose();
      renderer!.domElement.remove();
    };
  }, []);

  if (failed) return null;
  return <div ref={hostRef} aria-hidden="true" className="three-scene" data-reveal />;
}

/** Random points in a shell around the shape, so it reads as depth. */
function starGeometry(count: number): THREE.BufferGeometry {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 2.2 + Math.random() * 0.8;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}
