import { createUnitModule } from "@/lib/unitDataFactory";

export const DATA = [
  { key: "anatomy", name: "Anatomy", col: 0,
    courses: ["Kidneys", "Urethra", "Bladder"]
  },
  { key: "histology", name: "Histology", col: 0,
    courses: ["The urinary system (general overview)"]
  },
  { key: "physiology", name: "Physiology", col: 1,
    courses: [
      "Basic principles of renal physiology", "Glomerular filtration",
      "Tubular functions", "Urinary continence and micturition",
      "Renal balance of water, sodium, and protons",
      "TD — Measurement of the glomerular filtration rate",
    ]
  },
  { key: "biochemistry", name: "Biochemistry", col: 1,
    courses: ["Acid-base balance", "TD — Acid-base"]
  },
];

const mod = createUnitModule(DATA);
export const allTopics = mod.allTopics;
export const makeId = mod.makeId;
