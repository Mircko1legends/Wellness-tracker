import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
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

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox="-20 -10 160 160">
        <G rotation={category.grounded ? 90 : 0} origin="60,72">
          <CharacterRig pose={pose} />
        </G>
      </Svg>
    </View>
  );
}

const SKIN = colors.primary;
const ACCENT = colors.accent;
const OUTLINE = "#0B0D10";

function CharacterRig({ pose }: { pose: CharacterPose }) {
  const hipX = 60;
  const hipY = 84 + pose.hipHeight;
  const upperArmLen = 20;
  const forearmLen = 17;
  const thighLen = 22;
  const shinLen = 20;

  const shoulderX = 60;
  const shoulderY = hipY - 34;
  const headCx = 60;
  const headCy = shoulderY - 14;

  return (
    <G>
      {/* legs (behind torso) */}
      <G rotation={pose.rightHipAngle} origin={`${hipX + 6},${hipY}`}>
        <Rect x={hipX + 6 - 5} y={hipY} width={10} height={thighLen} rx={5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
        <G rotation={pose.rightKneeAngle} origin={`${hipX + 6},${hipY + thighLen}`}>
          <Rect x={hipX + 6 - 4.5} y={hipY + thighLen} width={9} height={shinLen} rx={4.5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
          <Ellipse cx={hipX + 6} cy={hipY + thighLen + shinLen + 3} rx={7} ry={4} fill={OUTLINE} />
        </G>
      </G>
      <G rotation={pose.leftHipAngle} origin={`${hipX - 6},${hipY}`}>
        <Rect x={hipX - 6 - 5} y={hipY} width={10} height={thighLen} rx={5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
        <G rotation={pose.leftKneeAngle} origin={`${hipX - 6},${hipY + thighLen}`}>
          <Rect x={hipX - 6 - 4.5} y={hipY + thighLen} width={9} height={shinLen} rx={4.5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
          <Ellipse cx={hipX - 6} cy={hipY + thighLen + shinLen + 3} rx={7} ry={4} fill={OUTLINE} />
        </G>
      </G>

      {/* torso + head, leaning as a unit */}
      <G rotation={pose.torsoAngle} origin={`${hipX},${hipY}`}>
        {/* shorts */}
        <Rect x={hipX - 12} y={hipY - 10} width={24} height={14} rx={4} fill={ACCENT} stroke={OUTLINE} strokeWidth={2} />
        {/* torso: broad shoulders tapering to waist */}
        <Path
          d={`M ${hipX - 10} ${hipY} L ${shoulderX - 15} ${shoulderY} Q ${shoulderX} ${shoulderY - 6} ${shoulderX + 15} ${shoulderY} L ${hipX + 10} ${hipY} Z`}
          fill={SKIN}
          stroke={OUTLINE}
          strokeWidth={2.5}
        />
        {/* ab lines for a muscular look */}
        <Path
          d={`M ${hipX} ${shoulderY + 6} L ${hipX} ${hipY - 8}`}
          stroke={OUTLINE}
          strokeWidth={1.5}
          opacity={0.5}
        />

        {/* arms */}
        <G rotation={pose.rightShoulderAngle} origin={`${shoulderX + 14},${shoulderY + 2}`}>
          <Rect x={shoulderX + 14 - 4.5} y={shoulderY + 2} width={9} height={upperArmLen} rx={4.5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
          <G rotation={pose.rightElbowAngle} origin={`${shoulderX + 14},${shoulderY + 2 + upperArmLen}`}>
            <Rect x={shoulderX + 14 - 4} y={shoulderY + 2 + upperArmLen} width={8} height={forearmLen} rx={4} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
            <Circle cx={shoulderX + 14} cy={shoulderY + 2 + upperArmLen + forearmLen + 3} r={5.5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
          </G>
        </G>
        <G rotation={pose.leftShoulderAngle} origin={`${shoulderX - 14},${shoulderY + 2}`}>
          <Rect x={shoulderX - 14 - 4.5} y={shoulderY + 2} width={9} height={upperArmLen} rx={4.5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
          <G rotation={pose.leftElbowAngle} origin={`${shoulderX - 14},${shoulderY + 2 + upperArmLen}`}>
            <Rect x={shoulderX - 14 - 4} y={shoulderY + 2 + upperArmLen} width={8} height={forearmLen} rx={4} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
            <Circle cx={shoulderX - 14} cy={shoulderY + 2 + upperArmLen + forearmLen + 3} r={5.5} fill={SKIN} stroke={OUTLINE} strokeWidth={2} />
          </G>
        </G>

        {/* head, with its own subtle tilt */}
        <G rotation={pose.headAngle} origin={`${headCx},${headCy}`}>
          <Circle cx={headCx} cy={headCy} r={11} fill={SKIN} stroke={OUTLINE} strokeWidth={2.5} />
          {/* spiky anime hair */}
          <Path
            d={`M ${headCx - 11} ${headCy - 4} L ${headCx - 14} ${headCy - 15} L ${headCx - 6} ${headCy - 9} L ${headCx - 4} ${headCy - 19} L ${headCx + 2} ${headCy - 10} L ${headCx + 6} ${headCy - 18} L ${headCx + 9} ${headCy - 8} L ${headCx + 12} ${headCy - 12} L ${headCx + 10} ${headCy - 2} Z`}
            fill={OUTLINE}
          />
          {/* eyes: confident/determined */}
          <Path d={`M ${headCx - 6} ${headCy} L ${headCx - 2} ${headCy - 1}`} stroke={OUTLINE} strokeWidth={1.8} />
          <Path d={`M ${headCx + 2} ${headCy - 1} L ${headCx + 6} ${headCy}`} stroke={OUTLINE} strokeWidth={1.8} />
        </G>
      </G>
    </G>
  );
}
