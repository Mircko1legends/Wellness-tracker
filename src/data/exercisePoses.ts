export interface CharacterPose {
  hipHeight: number; // vertical crouch offset from standing baseline (positive = lower)
  torsoAngle: number; // forward/back lean in degrees, 0 = upright
  headAngle: number;
  leftShoulderAngle: number; // 0 = arm hanging straight down
  leftElbowAngle: number; // 0 = straight
  rightShoulderAngle: number;
  rightElbowAngle: number;
  leftHipAngle: number; // 0 = leg straight down
  leftKneeAngle: number; // 0 = straight
  rightHipAngle: number;
  rightKneeAngle: number;
}

export type PoseCategory =
  | "squat"
  | "pushup"
  | "lunge"
  | "gluteBridge"
  | "calfRaise"
  | "plankHold"
  | "plankTap"
  | "coreCrunch"
  | "backExtension"
  | "burpee";

export interface PoseCategoryDef {
  grounded: boolean; // render the rig rotated horizontal, for floor exercises
  frames: CharacterPose[];
  frameDurationMs: number;
}

const standing: CharacterPose = {
  hipHeight: 0,
  torsoAngle: 0,
  headAngle: 0,
  leftShoulderAngle: 8,
  leftElbowAngle: 5,
  rightShoulderAngle: 8,
  rightElbowAngle: 5,
  leftHipAngle: 0,
  leftKneeAngle: 0,
  rightHipAngle: 0,
  rightKneeAngle: 0,
};

// Grounded base pose: arms perpendicular to the torso, pointing toward the
// ground once the whole rig is rotated 90° to lie flat (negative angle is
// what makes the support arm point "down" instead of "up" after rotation).
const proneSupport: CharacterPose = {
  hipHeight: 0,
  torsoAngle: 0,
  headAngle: 0,
  leftShoulderAngle: -95,
  leftElbowAngle: 0,
  rightShoulderAngle: -95,
  rightElbowAngle: 0,
  leftHipAngle: 0,
  leftKneeAngle: 0,
  rightHipAngle: 0,
  rightKneeAngle: 0,
};

// Grounded base pose for exercises that don't bear weight on the arms
// (lying on the back/front with arms resting near the body).
const groundedRest: CharacterPose = {
  hipHeight: 0,
  torsoAngle: 0,
  headAngle: 0,
  leftShoulderAngle: -10,
  leftElbowAngle: 0,
  rightShoulderAngle: -10,
  rightElbowAngle: 0,
  leftHipAngle: 0,
  leftKneeAngle: 0,
  rightHipAngle: 0,
  rightKneeAngle: 0,
};

export const POSE_CATEGORIES: Record<PoseCategory, PoseCategoryDef> = {
  squat: {
    grounded: false,
    frameDurationMs: 900,
    frames: [
      standing,
      {
        ...standing,
        hipHeight: 24,
        torsoAngle: -18,
        leftShoulderAngle: 60,
        leftElbowAngle: 10,
        rightShoulderAngle: 60,
        rightElbowAngle: 10,
        leftHipAngle: 55,
        leftKneeAngle: 95,
        rightHipAngle: 55,
        rightKneeAngle: 95,
      },
    ],
  },
  lunge: {
    grounded: false,
    frameDurationMs: 900,
    frames: [
      standing,
      {
        ...standing,
        hipHeight: 16,
        torsoAngle: -6,
        leftHipAngle: 45,
        leftKneeAngle: 90,
        rightHipAngle: -25,
        rightKneeAngle: 80,
      },
    ],
  },
  calfRaise: {
    grounded: false,
    frameDurationMs: 700,
    frames: [standing, { ...standing, hipHeight: -10 }],
  },
  pushup: {
    grounded: true,
    frameDurationMs: 850,
    frames: [
      proneSupport,
      { ...proneSupport, leftElbowAngle: -75, rightElbowAngle: -75, headAngle: -8 },
    ],
  },
  plankHold: {
    grounded: true,
    frameDurationMs: 1400,
    frames: [proneSupport, { ...proneSupport, hipHeight: 4 }],
  },
  plankTap: {
    grounded: true,
    frameDurationMs: 700,
    frames: [
      { ...proneSupport, leftElbowAngle: -30, rightShoulderAngle: -30, rightElbowAngle: -10 },
      { ...proneSupport, rightElbowAngle: -30, leftShoulderAngle: -30, leftElbowAngle: -10 },
    ],
  },
  gluteBridge: {
    grounded: true,
    frameDurationMs: 900,
    frames: [
      { ...groundedRest, leftHipAngle: 70, leftKneeAngle: 95, rightHipAngle: 70, rightKneeAngle: 95 },
      {
        ...groundedRest,
        hipHeight: -16,
        leftHipAngle: 70,
        leftKneeAngle: 95,
        rightHipAngle: 70,
        rightKneeAngle: 95,
      },
    ],
  },
  coreCrunch: {
    grounded: true,
    frameDurationMs: 850,
    frames: [
      { ...groundedRest, leftHipAngle: 45, rightHipAngle: 45, leftKneeAngle: 20, rightKneeAngle: 20 },
      {
        ...groundedRest,
        headAngle: 40,
        leftHipAngle: 85,
        rightHipAngle: 85,
        leftKneeAngle: 60,
        rightKneeAngle: 60,
      },
    ],
  },
  backExtension: {
    grounded: true,
    frameDurationMs: 900,
    frames: [
      { ...groundedRest, leftShoulderAngle: 10, rightShoulderAngle: 10 },
      {
        ...groundedRest,
        torsoAngle: -14,
        headAngle: -10,
        leftShoulderAngle: -25,
        rightShoulderAngle: -25,
        leftHipAngle: -8,
        rightHipAngle: -8,
      },
    ],
  },
  burpee: {
    grounded: false,
    frameDurationMs: 650,
    frames: [
      standing,
      {
        ...standing,
        hipHeight: 26,
        torsoAngle: -40,
        leftShoulderAngle: 90,
        rightShoulderAngle: 90,
        leftElbowAngle: 90,
        rightElbowAngle: 90,
        leftHipAngle: 70,
        leftKneeAngle: 100,
        rightHipAngle: 70,
        rightKneeAngle: 100,
      },
      {
        ...standing,
        hipHeight: -14,
        torsoAngle: 0,
        leftShoulderAngle: 150,
        rightShoulderAngle: 150,
        leftElbowAngle: 10,
        rightElbowAngle: 10,
        leftHipAngle: -10,
        rightHipAngle: -10,
      },
    ],
  },
};

export const EXERCISE_POSE_CATEGORY: Record<string, PoseCategory> = {
  "knee-pushup": "pushup",
  pushup: "pushup",
  "decline-pushup": "pushup",
  "diamond-pushup": "pushup",
  "pike-pushup": "pushup",
  "explosive-pushup": "pushup",
  squat: "squat",
  "jump-squat": "squat",
  lunges: "lunge",
  "reverse-lunge": "lunge",
  "jump-lunge": "lunge",
  "wall-sit": "squat",
  "glute-bridge": "gluteBridge",
  "single-leg-glute-bridge": "gluteBridge",
  "calf-raises": "calfRaise",
  plank: "plankHold",
  "side-plank": "plankHold",
  "mountain-climbers": "plankTap",
  "leg-raises": "coreCrunch",
  "bicycle-crunch": "coreCrunch",
  "hollow-hold": "coreCrunch",
  superman: "backExtension",
  "prone-y-raise": "backExtension",
  "shoulder-tap-plank": "plankTap",
  burpee: "burpee",
};
