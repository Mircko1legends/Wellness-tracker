import { Canvas } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import * as THREE from "three";
import { CharacterPose, PoseCategoryDef } from "../data/exercisePoses";
import { colors } from "../theme";

const SKIN = colors.primary;
const SKIN_DARK = "#8FA82A";
const SHORTS = colors.accent;
const SHORTS_DARK = "#8f1c16";
const HAIR = "#14161A";
const OUTLINE = "#0B0D10";

// SVG-space proportions carried over 1:1 from AnimeCharacter.tsx so the same
// pose data (CharacterPose degrees) produces a matching silhouette.
const SCALE = 0.036;
const TORSO_LEN = 35;
const HEAD_OFFSET = 15;
const HEAD_R = 10;
const UPPER_ARM_LEN = 20;
const FOREARM_LEN = 18;
const THIGH_LEN = 23;
const SHIN_LEN = 20;
const SHOULDER_OFFSET_X = 15;
const HIP_OFFSET_X = 7;

// SVG rotate() is clockwise-positive in a y-down frame; our rig extends
// limbs downward along -Y (a reflection of that frame), which reverses the
// sense of rotation. Negating converts an SVG-authored angle into the
// matching Three.js (counterclockwise-positive, right-hand rule) angle.
function toRad(deg: number): number {
  return -deg * (Math.PI / 180);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPose(a: CharacterPose, b: CharacterPose, t: number): CharacterPose {
  return {
    hipHeight: lerp(a.hipHeight, b.hipHeight, t),
    torsoAngle: lerp(a.torsoAngle, b.torsoAngle, t),
    headAngle: lerp(a.headAngle, b.headAngle, t),
    leftShoulderAngle: lerp(a.leftShoulderAngle, b.leftShoulderAngle, t),
    leftElbowAngle: lerp(a.leftElbowAngle, b.leftElbowAngle, t),
    rightShoulderAngle: lerp(a.rightShoulderAngle, b.rightShoulderAngle, t),
    rightElbowAngle: lerp(a.rightElbowAngle, b.rightElbowAngle, t),
    leftHipAngle: lerp(a.leftHipAngle, b.leftHipAngle, t),
    leftKneeAngle: lerp(a.leftKneeAngle, b.leftKneeAngle, t),
    rightHipAngle: lerp(a.rightHipAngle, b.rightHipAngle, t),
    rightKneeAngle: lerp(a.rightKneeAngle, b.rightKneeAngle, t),
  };
}

// 3-step flat gradient map: gives MeshToonMaterial its cel-shaded "anime" look.
let toonGradient: THREE.DataTexture | null = null;
function getToonGradient(): THREE.DataTexture {
  if (!toonGradient) {
    const data = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]);
    const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    toonGradient = tex;
  }
  return toonGradient;
}

// Shared low-poly geometries, built once and reused across every instance.
const SHORTS_LEN = 11;

const geo = {
  head: new THREE.SphereGeometry(HEAD_R * SCALE, 14, 12),
  // Broad shoulders tapering to a narrow waist (V-taper), matching the 2D rig's silhouette.
  torso: new THREE.CylinderGeometry(0.26, 0.145, TORSO_LEN * SCALE, 8),
  shorts: new THREE.CylinderGeometry(0.165, 0.2, SHORTS_LEN * SCALE, 8),
  upperArm: new THREE.CylinderGeometry(0.075, 0.1, UPPER_ARM_LEN * SCALE, 7),
  forearm: new THREE.CylinderGeometry(0.06, 0.078, FOREARM_LEN * SCALE, 7),
  hand: new THREE.SphereGeometry(6 * SCALE, 8, 8),
  shoulderBall: new THREE.SphereGeometry(6 * SCALE, 8, 8),
  thigh: new THREE.CylinderGeometry(0.1, 0.135, THIGH_LEN * SCALE, 7),
  shin: new THREE.CylinderGeometry(0.08, 0.1, SHIN_LEN * SCALE, 7),
  foot: new THREE.BoxGeometry(0.22, 0.07, 0.13),
  hair: new THREE.ConeGeometry(0.045, 0.16, 5),
  wristband: new THREE.CylinderGeometry(0.082, 0.082, 0.06, 8),
};

interface PartProps {
  geometry: THREE.BufferGeometry;
  color: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  outline?: boolean;
}

function Part({ geometry, color, position, rotation, outline = true }: PartProps) {
  const gradientMap = getToonGradient();
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geometry}>
        <meshToonMaterial color={color} gradientMap={gradientMap} />
      </mesh>
      {outline && (
        <mesh geometry={geometry} scale={1.06}>
          <meshBasicMaterial color={OUTLINE} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
}

interface ArmProps {
  side: 1 | -1;
  shoulderAngle: number;
  elbowAngle: number;
}

const SHOULDER_Y = TORSO_LEN - 3;

function Arm({ side, shoulderAngle, elbowAngle }: ArmProps) {
  const upperLen = UPPER_ARM_LEN * SCALE;
  const foreLen = FOREARM_LEN * SCALE;
  return (
    <group position={[side * SHOULDER_OFFSET_X * SCALE, SHOULDER_Y * SCALE, 0]} rotation={[0, 0, toRad(shoulderAngle)]}>
      <Part geometry={geo.shoulderBall} color={SKIN} />
      <Part geometry={geo.upperArm} color={SKIN} position={[0, -upperLen / 2, 0]} />
      <group position={[0, -upperLen, 0]} rotation={[0, 0, toRad(elbowAngle)]}>
        <Part geometry={geo.forearm} color={SKIN} position={[0, -foreLen / 2, 0]} />
        <Part geometry={geo.wristband} color={SHORTS} position={[0, -foreLen + 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Part geometry={geo.hand} color={SKIN_DARK} position={[0, -foreLen - 0.04, 0]} />
      </group>
    </group>
  );
}

interface LegProps {
  side: 1 | -1;
  hipAngle: number;
  kneeAngle: number;
}

function Leg({ side, hipAngle, kneeAngle }: LegProps) {
  const thighLen = THIGH_LEN * SCALE;
  const shinLen = SHIN_LEN * SCALE;
  return (
    <group position={[side * HIP_OFFSET_X * SCALE, 0, 0]} rotation={[0, 0, toRad(hipAngle)]}>
      <Part geometry={geo.thigh} color={SKIN} position={[0, -thighLen / 2, 0]} />
      <group position={[0, -thighLen, 0]} rotation={[0, 0, toRad(kneeAngle)]}>
        <Part geometry={geo.shin} color={SKIN} position={[0, -shinLen / 2, 0]} />
        <Part geometry={geo.foot} color={OUTLINE} position={[0, -shinLen - 0.03, 0.04]} outline={false} />
      </group>
    </group>
  );
}

const HAIR_CONE_LEN = 0.16;
const EYE_R = 0.028;

function Head({ headAngle }: { headAngle: number }) {
  const r = HEAD_R * SCALE;
  return (
    <group position={[0, HEAD_OFFSET * SCALE, 0]} rotation={[0, 0, toRad(headAngle)]}>
      <Part geometry={geo.head} color={SKIN} />
      {/* eyes, on the camera-facing hemisphere */}
      <mesh position={[-r * 0.36, r * 0.05, r * 0.86]}>
        <sphereGeometry args={[EYE_R, 8, 8]} />
        <meshBasicMaterial color={OUTLINE} />
      </mesh>
      <mesh position={[r * 0.36, r * 0.05, r * 0.86]}>
        <sphereGeometry args={[EYE_R, 8, 8]} />
        <meshBasicMaterial color={OUTLINE} />
      </mesh>
      {/* spiky anime hair, cones flush against the scalp, fanned across the crown */}
      {[-0.65, -0.35, 0, 0.35, 0.65].map((t, i) => {
        const lateral = t * r * 0.85;
        const forward = -Math.abs(t) * r * 0.35;
        const depthSq = r * r - lateral * lateral - forward * forward;
        const surfaceY = Math.sqrt(Math.max(depthSq, 0.01)) * 0.98;
        return (
          <Part
            key={i}
            geometry={geo.hair}
            color={HAIR}
            outline={false}
            position={[lateral, surfaceY + HAIR_CONE_LEN / 2 - r * 0.12, forward]}
            rotation={[0.2, 0, -t * 0.9]}
          />
        );
      })}
    </group>
  );
}

function Rig({ pose }: { pose: CharacterPose }) {
  const torsoLen = TORSO_LEN * SCALE;
  return (
    <group position={[0, -pose.hipHeight * SCALE, 0]}>
      <Leg side={1} hipAngle={pose.rightHipAngle} kneeAngle={pose.rightKneeAngle} />
      <Leg side={-1} hipAngle={pose.leftHipAngle} kneeAngle={pose.leftKneeAngle} />

      <group rotation={[0, 0, toRad(pose.torsoAngle)]}>
        <Part geometry={geo.shorts} color={SHORTS} position={[0, (SHORTS_LEN * SCALE) / 2, 0]} />
        <Part geometry={geo.torso} color={SKIN} position={[0, torsoLen / 2, 0]} />
        <Arm side={1} shoulderAngle={pose.rightShoulderAngle} elbowAngle={pose.rightElbowAngle} />
        <Arm side={-1} shoulderAngle={pose.leftShoulderAngle} elbowAngle={pose.leftElbowAngle} />
        <group position={[0, torsoLen, 0]}>
          <Head headAngle={pose.headAngle} />
        </group>
      </group>
    </group>
  );
}

interface Props {
  category: PoseCategoryDef;
  size?: number;
}

export function AnimeCharacter3D({ category, size = 140 }: Props) {
  const [pose, setPose] = useState<CharacterPose>(category.frames[0]);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const totalDuration = category.frameDurationMs * category.frames.length;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const cyclePos = (elapsed % totalDuration) / category.frameDurationMs;
      const frameIndex = Math.floor(cyclePos);
      const t = cyclePos - frameIndex;
      const nextIndex = (frameIndex + 1) % category.frames.length;
      setPose(lerpPose(category.frames[frameIndex], category.frames[nextIndex], t));
    }, 50);
    return () => clearInterval(interval);
  }, [category]);

  const groundedRotation = useMemo<[number, number, number]>(
    () => [0, 0, category.grounded ? toRad(90) : 0],
    [category.grounded],
  );

  return (
    <View style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0.3, 9], fov: 30 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.65} />
        <directionalLight position={[1.5, 2, 2]} intensity={1.1} />
        <directionalLight position={[-1.5, -0.5, 1]} intensity={0.35} />
        <group position={[0, -0.35, 0]} rotation={groundedRotation}>
          <Rig pose={pose} />
        </group>
      </Canvas>
    </View>
  );
}
