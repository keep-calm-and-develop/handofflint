import type { EvalCaseId, EvalCaseMeta } from "@/lib/evals/types";

export const EVAL_RUNS_PER_CASE = 10;

export const EVAL_CASE_ORDER: EvalCaseId[] = [
  "vaxin-1-4",
  "vaxin-20-0",
  "bittersweet-9-153",
];

export const EVAL_CASES: Record<EvalCaseId, EvalCaseMeta> = {
  "vaxin-1-4": {
    id: "vaxin-1-4",
    label: "vaxin — Google Pixel 2 - 1",
    fileKey: "kvT3qcauDE67CW76Kb56Qw",
    nodeId: "1:4",
    frameName: "Google Pixel 2 - 1",
    layoutProfile: "mobile-app",
    figmaUrl:
      "https://www.figma.com/design/kvT3qcauDE67CW76Kb56Qw/vaxin?node-id=1-4",
    imagePath: "/evals/golden/vaxin-1-4/image.png",
    nodesSource: "example.json",
    imageSourceUrl:
      "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/33f30ad2-8de0-4e29-a22e-d47ecf272e67",
    order: 1,
  },
  "vaxin-20-0": {
    id: "vaxin-20-0",
    label: "vaxin — Google Pixel 2 - 4",
    fileKey: "kvT3qcauDE67CW76Kb56Qw",
    nodeId: "20:0",
    frameName: "Google Pixel 2 - 4",
    layoutProfile: "mobile-app",
    figmaUrl:
      "https://www.figma.com/design/kvT3qcauDE67CW76Kb56Qw/vaxin?node-id=20-0",
    imagePath: "/evals/golden/vaxin-20-0/image.png",
    nodesSource: "figma-output/kvT3qcauDE67CW76Kb56Qw_2026-06-10T08-28-44-322Z",
    imageSourceUrl:
      "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/d01b4569-0e5b-4dca-b13b-bc1f7ec66b22",
    order: 2,
  },
  "bittersweet-9-153": {
    id: "bittersweet-9-153",
    label: "Bittersweet — Order Details Modal",
    fileKey: "Ii83n99A2f6VqzHNerla4d",
    nodeId: "9:153",
    frameName: "Order Details Modal",
    layoutProfile: "mobile-app",
    figmaUrl:
      "https://www.figma.com/design/Ii83n99A2f6VqzHNerla4d/Bittersweet-Symphony-Employee-App?node-id=9-153",
    imagePath: "/evals/golden/bittersweet-9-153/image.png",
    nodesSource:
      "figma-output/Ii83n99A2f6VqzHNerla4d_2026-06-10T08-27-21-282Z",
    imageSourceUrl:
      "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/1153dc24-7b28-4fc2-9cef-29e7ee03d43b",
    order: 3,
  },
};

export function isEvalCaseId(value: string): value is EvalCaseId {
  return value in EVAL_CASES;
}

export function getEvalCase(caseId: EvalCaseId): EvalCaseMeta {
  return EVAL_CASES[caseId];
}

export function getPriorEvalCase(caseId: EvalCaseId): EvalCaseId | null {
  const index = EVAL_CASE_ORDER.indexOf(caseId);
  if (index <= 0) return null;
  return EVAL_CASE_ORDER[index - 1] ?? null;
}
