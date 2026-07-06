import React, { useEffect, useId, useRef, useState } from "react";
import { View } from "react-native";
import { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Svg } from "react-native-svg";
import { CharacterPose, PoseCategoryDef } from "../data/exercisePoses";
import { colors } from "../theme";

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

interface Props {
  category: PoseCategoryDef;
  size?: number;
}

export function AnimeCharacter({ category, size = 140 }: Props) {
  const [pose, setPose] = useState<CharacterPose>(category.frames[0]);
  const startRef = useRef(Date.now());
  // Unique per instance so multiple characters on screen at once don't
  // collide on the same <LinearGradient id>, which would make one of them
  // render with a missing fill.
  const gradientId = useId();

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

  const skinGradId = `skin${gradientId}`;
  const shortsGradId = `shorts${gradientId}`;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="-20 -10 160 160">
        <Defs>
          <LinearGradient id={skinGradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={SKIN} />
            <Stop offset="1" stopColor={SKIN_DARK} />
          </LinearGradient>
          <LinearGradient id={shortsGradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={ACCENT} />
            <Stop offset="1" stopColor={ACCENT_DARK} />
          </LinearGradient>
        </Defs>
        <G rotation={category.grounded ? 90 : 0} origin="60,72">
          <CharacterRig pose={pose} skinFill={`url(#${skinGradId})`} shortsFill={`url(#${shortsGradId})`} />
        </G>
      </Svg>
    </View>
  );
}

const SKIN = colors.primary;
const SKIN_DARK = "#9FC71A";
const ACCENT = colors.accent;
const ACCENT_DARK = "#B8271F";
const OUTLINE = "#0B0D10";

interface RigProps {
  pose: CharacterPose;
  skinFill: string;
  shortsFill: string;
}

function taperedLimb(x: number, yTop: number, yBot: number, wTop: number, wBot: number, fill: string) {
  const mid = (yTop + yBot) / 2;
  return (
    <Path
      d={`M ${x - wTop / 2} ${yTop} Q ${x - wTop / 2 - 1} ${mid} ${x - wBot / 2} ${yBot}
          L ${x + wBot / 2} ${yBot} Q ${x + wTop / 2 + 1} ${mid} ${x + wTop / 2} ${yTop} Z`}
      fill={fill}
      stroke={OUTLINE}
      strokeWidth={2}
      strokeLinejoin="round"
    />
  );
}

function CharacterRig({ pose, skinFill, shortsFill }: RigProps) {
  const hipX = 60;
  const hipY = 84 + pose.hipHeight;
  const upperArmLen = 20;
  const forearmLen = 18;
  const thighLen = 23;
  const shinLen = 20;

  const shoulderX = 60;
  const shoulderY = hipY - 35;
  const headCx = 60;
  const headCy = shoulderY - 15;

  function armGroup(side: 1 | -1, shoulderAngle: number, elbowAngle: number) {
    const sx = shoulderX + side * 15;
    return (
      <G rotation={shoulderAngle} origin={`${sx},${shoulderY + 3}`}>
        <Circle cx={sx} cy={shoulderY + 2} r={6} fill={skinFill} stroke={OUTLINE} strokeWidth={2} />
        {taperedLimb(sx, shoulderY + 3, shoulderY + 3 + upperArmLen, 11, 8, skinFill)}
        <G rotation={elbowAngle} origin={`${sx},${shoulderY + 3 + upperArmLen}`}>
          {taperedLimb(sx, shoulderY + 3 + upperArmLen, shoulderY + 3 + upperArmLen + forearmLen, 8, 6.5, skinFill)}
          <Rect
            x={sx - 4.5}
            y={shoulderY + 3 + upperArmLen + forearmLen - 2}
            width={9}
            height={4}
            rx={1.5}
            fill={ACCENT}
            stroke={OUTLINE}
            strokeWidth={1.3}
          />
          <Circle
            cx={sx}
            cy={shoulderY + 3 + upperArmLen + forearmLen + 5}
            r={6}
            fill={skinFill}
            stroke={OUTLINE}
            strokeWidth={2}
          />
        </G>
      </G>
    );
  }

  function legGroup(side: 1 | -1, hipAngle: number, kneeAngle: number) {
    const lx = hipX + side * 7;
    const footTip = side > 0 ? `${lx - 8} ${hipY + thighLen + shinLen} L ${lx + 9} ${hipY + thighLen + shinLen} L ${lx + 9} ${hipY + thighLen + shinLen + 5} L ${lx - 8} ${hipY + thighLen + shinLen + 6}`
      : `${lx - 9} ${hipY + thighLen + shinLen} L ${lx + 8} ${hipY + thighLen + shinLen} L ${lx + 8} ${hipY + thighLen + shinLen + 6} L ${lx - 9} ${hipY + thighLen + shinLen + 5}`;
    return (
      <G rotation={hipAngle} origin={`${lx},${hipY}`}>
        {taperedLimb(lx, hipY, hipY + thighLen, 13, 9, skinFill)}
        <G rotation={kneeAngle} origin={`${lx},${hipY + thighLen}`}>
          {taperedLimb(lx, hipY + thighLen, hipY + thighLen + shinLen, 9, 7, skinFill)}
          <Path d={`M ${footTip} Z`} fill={OUTLINE} />
        </G>
      </G>
    );
  }

  return (
    <G>
      {legGroup(1, pose.rightHipAngle, pose.rightKneeAngle)}
      {legGroup(-1, pose.leftHipAngle, pose.leftKneeAngle)}

      <G rotation={pose.torsoAngle} origin={`${hipX},${hipY}`}>
        {/* fighting shorts with side stripes and belt knot */}
        <Path
          d={`M ${hipX - 13} ${hipY - 11} L ${hipX + 13} ${hipY - 11} L ${hipX + 15} ${hipY + 5} Q ${hipX} ${hipY + 9} ${hipX - 15} ${hipY + 5} Z`}
          fill={shortsFill}
          stroke={OUTLINE}
          strokeWidth={2}
        />
        <Path d={`M ${hipX - 13} ${hipY - 9} L ${hipX - 15.5} ${hipY + 4}`} stroke={SKIN} strokeWidth={2} opacity={0.85} />
        <Path d={`M ${hipX + 13} ${hipY - 9} L ${hipX + 15.5} ${hipY + 4}`} stroke={SKIN} strokeWidth={2} opacity={0.85} />
        <Rect x={hipX - 3} y={hipY - 11} width={6} height={5} rx={1} fill={OUTLINE} />

        {/* torso: broad shoulders tapering to a narrow waist */}
        <Path
          d={`M ${hipX - 9} ${hipY}
              C ${hipX - 13} ${hipY - 14} ${shoulderX - 17} ${shoulderY + 8} ${shoulderX - 17} ${shoulderY}
              Q ${shoulderX} ${shoulderY - 7} ${shoulderX + 17} ${shoulderY}
              C ${shoulderX + 17} ${shoulderY + 8} ${hipX + 13} ${hipY - 14} ${hipX + 9} ${hipY} Z`}
          fill={skinFill}
          stroke={OUTLINE}
          strokeWidth={2.5}
        />
        <Path
          d={`M ${shoulderX - 11} ${shoulderY + 7} Q ${shoulderX} ${shoulderY + 11} ${shoulderX + 11} ${shoulderY + 7}`}
          stroke={OUTLINE}
          strokeWidth={1.3}
          opacity={0.55}
          fill="none"
        />
        <Path d={`M ${hipX} ${shoulderY + 10} L ${hipX} ${hipY - 6}`} stroke={OUTLINE} strokeWidth={1.3} opacity={0.5} />
        <Path d={`M ${hipX - 5} ${shoulderY + 15} L ${hipX - 5} ${hipY - 8}`} stroke={OUTLINE} strokeWidth={1} opacity={0.35} />
        <Path d={`M ${hipX + 5} ${shoulderY + 15} L ${hipX + 5} ${hipY - 8}`} stroke={OUTLINE} strokeWidth={1} opacity={0.35} />

        {armGroup(1, pose.rightShoulderAngle, pose.rightElbowAngle)}
        {armGroup(-1, pose.leftShoulderAngle, pose.leftElbowAngle)}

        {/* head, with its own subtle tilt */}
        <G rotation={pose.headAngle} origin={`${headCx},${headCy}`}>
          <Circle cx={headCx} cy={headCy} r={12} fill={skinFill} stroke={OUTLINE} strokeWidth={2.5} />
          <Path
            d={`M ${headCx - 7} ${headCy + 7} Q ${headCx} ${headCy + 11} ${headCx + 7} ${headCy + 7}`}
            stroke={OUTLINE}
            strokeWidth={1}
            opacity={0.4}
            fill="none"
          />

          {/* headband tails, drawn before hair so the hair sits on top */}
          <Path
            d={`M ${headCx + 11} ${headCy + 2} Q ${headCx + 18} ${headCy + 8} ${headCx + 13} ${headCy + 16}`}
            stroke={ACCENT_DARK}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d={`M ${headCx + 11} ${headCy} Q ${headCx + 20} ${headCy + 3} ${headCx + 17} ${headCy + 12}`}
            stroke={ACCENT}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* spiky hair: valleys stay near the top of the head so the fill
              reads as spikes, not a blob covering the face */}
          <Path
            d={`M ${headCx - 9} ${headCy - 9}
                L ${headCx - 17} ${headCy - 25}
                L ${headCx - 8} ${headCy - 14}
                L ${headCx - 4} ${headCy - 29}
                L ${headCx} ${headCy - 14}
                L ${headCx + 4} ${headCy - 31}
                L ${headCx + 8} ${headCy - 14}
                L ${headCx + 18} ${headCy - 23}
                L ${headCx + 9} ${headCy - 9}
                Z`}
            fill={OUTLINE}
          />
          <Path
            d={`M ${headCx + 1} ${headCy - 27} L ${headCx + 4} ${headCy - 16} L ${headCx - 1} ${headCy - 17} Z`}
            fill={SKIN}
            opacity={0.45}
          />

          <Path
            d={`M ${headCx - 12} ${headCy - 1} Q ${headCx} ${headCy - 7} ${headCx + 12} ${headCy - 1} L ${headCx + 12} ${headCy + 2} Q ${headCx} ${headCy - 3} ${headCx - 12} ${headCy + 2} Z`}
            fill={ACCENT}
            stroke={OUTLINE}
            strokeWidth={1.3}
          />

          {/* intense angled eyebrows + eyes */}
          <Path d={`M ${headCx - 8} ${headCy - 3} L ${headCx - 2} ${headCy - 1}`} stroke={OUTLINE} strokeWidth={2.2} strokeLinecap="round" />
          <Path d={`M ${headCx + 2} ${headCy - 1} L ${headCx + 8} ${headCy - 3}`} stroke={OUTLINE} strokeWidth={2.2} strokeLinecap="round" />
          <Path d={`M ${headCx - 7} ${headCy + 2} L ${headCx - 2} ${headCy + 1}`} stroke={OUTLINE} strokeWidth={1.6} strokeLinecap="round" />
          <Path d={`M ${headCx + 2} ${headCy + 1} L ${headCx + 7} ${headCy + 2}`} stroke={OUTLINE} strokeWidth={1.6} strokeLinecap="round" />
          <Path
            d={`M ${headCx - 2.5} ${headCy + 6} L ${headCx + 2.5} ${headCy + 6}`}
            stroke={OUTLINE}
            strokeWidth={1.4}
            strokeLinecap="round"
            opacity={0.7}
          />
        </G>
      </G>
    </G>
  );
}
