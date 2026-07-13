import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  /** 오늘 성공/실패 건수 — 흐름의 밀도와 색에 반영된다 */
  success?: number;
  fail?: number;
  /** 다크모드 여부 (배경/색 톤 전환) */
  dark?: boolean;
}

/**
 * 대시보드 히어로: 소스 → 엔진 → 타겟 데이터 흐름을 3D로 표현.
 *
 * - 왼쪽 노드(소스 시스템) → 가운데 코어(IF 엔진) → 오른쪽 노드(타겟 시스템)
 * - 파티클이 실제로 흐른다. 실패 건수가 있으면 일부 파티클이 붉게 물든다.
 * - 마우스를 따라 씬이 부드럽게 기운다 (parallax).
 *
 * 성능: 파티클은 단일 BufferGeometry + Points로 그린다 (draw call 1회).
 * 탭이 백그라운드면 렌더 루프를 멈춘다.
 */
export default function FlowScene({ success = 0, fail = 0, dark = false }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // 최신 props를 렌더 루프에서 읽기 위한 ref (루프를 재생성하지 않기 위해)
  const stateRef = useRef({ success, fail, dark });
  stateRef.current = { success, fail, dark };

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 9);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const root = new THREE.Group();
    // 통계 카드가 하단에 겹치므로 씬 전체를 위로 올린다
    root.position.y = 0.9;
    scene.add(root);

    // ── 색상 (iOS 팔레트와 맞춤) ──
    const ACCENT = new THREE.Color("#007AFF");
    const PURPLE = new THREE.Color("#8B3DFF");
    const OK = new THREE.Color("#34C759");
    const DANGER = new THREE.Color("#FF3B30");

    // ── 시스템 노드 ──
    const SRC_X = -4.2;
    const TGT_X = 4.2;
    const srcPositions = [
      new THREE.Vector3(SRC_X, 1.6, 0),
      new THREE.Vector3(SRC_X, 0, 0.6),
      new THREE.Vector3(SRC_X, -1.6, -0.4),
    ];
    const tgtPositions = [
      new THREE.Vector3(TGT_X, 1.4, -0.3),
      new THREE.Vector3(TGT_X, -0.2, 0.5),
      new THREE.Vector3(TGT_X, -1.7, 0),
    ];

    const nodeGeo = new THREE.IcosahedronGeometry(0.34, 1);
    function makeNode(pos: THREE.Vector3, color: THREE.Color) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(pos);
      // 와이어프레임 껍질 — 기술적인 느낌
      const shell = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.46, 1),
        new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.25 })
      );
      mesh.add(shell);
      root.add(mesh);
      return mesh;
    }
    const srcNodes = srcPositions.map((p) => makeNode(p, ACCENT));
    const tgtNodes = tgtPositions.map((p) => makeNode(p, PURPLE));

    // ── 엔진 코어 (가운데) ──
    const core = new THREE.Group();
    const coreInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.62, 2),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.85 })
    );
    const coreShell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.05, 1),
      new THREE.MeshBasicMaterial({ color: PURPLE, wireframe: true, transparent: true, opacity: 0.35 })
    );
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.012, 8, 96),
      new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.5 })
    );
    coreRing.rotation.x = Math.PI / 2.2;
    core.add(coreInner, coreShell, coreRing);
    root.add(core);

    // ── 연결선 (노드 ↔ 코어) ──
    const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.18 });
    [...srcPositions, ...tgtPositions].forEach((p) => {
      const geo = new THREE.BufferGeometry().setFromPoints([p, new THREE.Vector3(0, 0, 0)]);
      root.add(new THREE.Line(geo, lineMat));
    });

    // ── 파티클 (실제 데이터 흐름) ──
    const COUNT = 420;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    // 각 파티클의 진행도(t)와 경로(어느 소스에서 어느 타겟으로), 속도
    const prog = new Float32Array(COUNT);
    const speed = new Float32Array(COUNT);
    const srcIdx = new Uint8Array(COUNT);
    const tgtIdx = new Uint8Array(COUNT);
    const isFail = new Uint8Array(COUNT);
    const wobble = new Float32Array(COUNT);

    function resetParticle(i: number, randomStart: boolean) {
      prog[i] = randomStart ? Math.random() : 0;
      speed[i] = 0.0022 + Math.random() * 0.0035;
      srcIdx[i] = Math.floor(Math.random() * srcPositions.length);
      tgtIdx[i] = Math.floor(Math.random() * tgtPositions.length);
      wobble[i] = Math.random() * Math.PI * 2;

      // 실패 비율만큼 붉은 파티클 (최소 표시를 위해 상한 25%)
      const { success: s, fail: f } = stateRef.current;
      const total = s + f;
      const failRate = total > 0 ? Math.min(f / total, 0.25) : 0;
      isFail[i] = Math.random() < failRate ? 1 : 0;
    }
    for (let i = 0; i < COUNT; i++) resetParticle(i, true);

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    // 라이트 모드에선 AdditiveBlending이 밝은 배경에 묻힌다 → 일반 블렌딩 + 큰 점
    const isDarkInit = stateRef.current.dark;
    const pMat = new THREE.PointsMaterial({
      size: isDarkInit ? 0.085 : 0.11,
      vertexColors: true,
      transparent: true,
      opacity: isDarkInit ? 0.95 : 1,
      blending: isDarkInit ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(pGeo, pMat);
    root.add(points);

    const tmp = new THREE.Vector3();
    const c = new THREE.Color();
    const CENTER = new THREE.Vector3(0, 0, 0);

    /** 소스 → 코어 → 타겟을 잇는 곡선 경로 위의 점 */
    function pathPoint(i: number, t: number, out: THREE.Vector3) {
      const from = srcPositions[srcIdx[i]];
      const to = tgtPositions[tgtIdx[i]];
      if (t < 0.5) {
        // 소스 → 코어
        const k = t * 2;
        out.copy(from).lerp(CENTER, k);
        // 코어로 빨려들어가는 느낌: 중간에 살짝 부풀림
        out.y += Math.sin(k * Math.PI) * 0.35;
      } else {
        // 코어 → 타겟
        const k = (t - 0.5) * 2;
        out.copy(CENTER).lerp(to, k);
        out.y += Math.sin(k * Math.PI) * 0.35;
      }
      return out;
    }

    // ── 마우스 parallax ──
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    function onMove(e: MouseEvent) {
      const r = mount!.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    mount.addEventListener("mousemove", onMove);
    mount.addEventListener("mouseleave", () => { target.x = 0; target.y = 0; });

    // ── 렌더 루프 ──
    let raf = 0;
    let running = true;
    const clock = new THREE.Clock();

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);

      // 파티클 갱신
      for (let i = 0; i < COUNT; i++) {
        prog[i] += speed[i] * (dt * 60);
        if (prog[i] >= 1) resetParticle(i, false);

        pathPoint(i, prog[i], tmp);
        // 살랑거림 (경로가 딱딱해 보이지 않게)
        const w = wobble[i] + t * 1.5;
        tmp.z += Math.sin(w) * 0.12;
        tmp.y += Math.cos(w * 0.7) * 0.06;

        const o = i * 3;
        positions[o] = tmp.x;
        positions[o + 1] = tmp.y;
        positions[o + 2] = tmp.z;

        // 색: 소스(파랑) → 코어에서 초록/빨강 판정 → 타겟(보라)
        if (isFail[i] && prog[i] > 0.5) {
          c.copy(DANGER);
        } else if (prog[i] < 0.5) {
          c.copy(ACCENT).lerp(OK, prog[i] * 2 * 0.5);
        } else {
          c.copy(OK).lerp(PURPLE, (prog[i] - 0.5) * 2);
        }
        // 코어 근처에서 밝게 (에너지 느낌). 라이트 모드는 어둡게 유지해야 배경에 안 묻힌다.
        const glow = 1 - Math.abs(prog[i] - 0.5) * 1.4;
        c.multiplyScalar(stateRef.current.dark ? 0.75 + glow * 0.5 : 0.85);
        colors[o] = c.r; colors[o + 1] = c.g; colors[o + 2] = c.b;
      }
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.color.needsUpdate = true;

      // 코어 회전 + 맥동
      core.rotation.y += dt * 0.35;
      core.rotation.x = Math.sin(t * 0.3) * 0.12;
      const pulse = 1 + Math.sin(t * 2.2) * 0.045;
      coreInner.scale.setScalar(pulse);
      coreShell.rotation.y -= dt * 0.22;
      coreShell.rotation.z += dt * 0.1;
      coreRing.rotation.z += dt * 0.15;

      // 노드 부유
      srcNodes.forEach((n, i) => { n.position.y = srcPositions[i].y + Math.sin(t * 0.9 + i) * 0.09; n.rotation.y += dt * 0.4; });
      tgtNodes.forEach((n, i) => { n.position.y = tgtPositions[i].y + Math.sin(t * 0.8 + i + 2) * 0.09; n.rotation.y -= dt * 0.35; });

      // 마우스 parallax (부드럽게 따라감)
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;
      root.rotation.y = mouse.x * 0.22;
      root.rotation.x = mouse.y * 0.12;

      renderer.render(scene, camera);
    }
    frame();

    // 탭이 안 보이면 렌더 중단 (배터리/CPU 절약)
    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta(); // 누적된 delta 버림
        frame();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    // 리사이즈
    const ro = new ResizeObserver(() => {
      const w = mount!.clientWidth, h = mount!.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      mount.removeEventListener("mousemove", onMove);
      ro.disconnect();
      renderer.dispose();
      pGeo.dispose();
      pMat.dispose();
      nodeGeo.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
          o.geometry?.dispose?.();
          const m = o.material as THREE.Material | THREE.Material[];
          Array.isArray(m) ? m.forEach((x) => x.dispose()) : m?.dispose?.();
        }
      });
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []); // 씬은 한 번만 만든다. 데이터 변화는 stateRef로 읽는다.

  return <div ref={mountRef} className="absolute inset-0" />;
}
