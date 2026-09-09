import { createUnitModule } from "@/lib/unitDataFactory";

export const DATA = [
  { key: "anatomy", name: "Anatomy", col: 0,
    courses: [
      "Hypothalamus-pituitary", "Thyroid, parathyroid, adrenal glands",
      "Mammary gland", "Ovaries and tubes",
      "Uterus and external genital organs", "Testes and spermatic pathways",
      "Prostate, urethra, erectile bodies", "Perineum",
    ]
  },
  { key: "histology", name: "Histology", col: 0,
    courses: [
      "General overview of endocrine glands", "Hypothalamus-pituitary",
      "Pineal gland", "Thyroid / parathyroid complex", "Adrenal gland",
      "Endocrine pancreas", "Undifferentiated gonad",
      "Male genital tract", "Female genital tract", "Mammary gland",
    ]
  },
  { key: "physiology", name: "Physiology", col: 1,
    courses: [
      "Principles of hormonal control systems",
      "Hypothalamic-pituitary relations", "Insulin-glucagon complex",
      "Thyroid", "Physiology of the adrenal cortex",
      "GH-somatomedin hormonal complex",
      "Endocrine control of calcium homeostasis", "Male gonadal function",
      "Female gonadal function", "Pregnancy and lactation",
      "TD — Glycoregulation",
      "TD — Dysfunction of the hypothalamic-pituitary-endocrine and effector axis",
    ]
  },
  { key: "biochemistry", name: "Biochemistry", col: 1,
    courses: [
      "General overview of hormones", "Hypothalamic-pituitary hormones",
      "Steroid hormones", "Thyroid hormones", "Catecholamines",
      "TD — Practical session",
    ]
  },
];

const mod = createUnitModule(DATA);
export const allTopics = mod.allTopics;
export const makeId = mod.makeId;
