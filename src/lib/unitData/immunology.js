import { createUnitModule } from "@/lib/unitDataFactory";

export const DATA = [
  { key: "immunology", name: "Immunology", col: 0,
    courses: [
      "Introduction to immunology", "Lymphoid organs", "Cellular actors",
      "Molecular actors and recognition structures", "Antigens",
      "The complement system", "The major histocompatibility complex",
      "T lymphocyte and TCR", "B lymphocyte and BCR", "Immunoglobulins",
      "Cytokines, chemokines, and their receptors",
      "Cell adhesion molecules",
      "Cellular interactions during the immune response",
      "Immunological aspects of the immune reaction process",
    ]
  },
];

const mod = createUnitModule(DATA);
export const allTopics = mod.allTopics;
export const makeId = mod.makeId;
