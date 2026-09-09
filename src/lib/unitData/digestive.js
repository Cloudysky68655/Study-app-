import { createUnitModule } from "@/lib/unitDataFactory";

export const DATA = [
  { key: "anatomy", name: "Anatomy", col: 0,
    courses: [
      "Oral cavity", "Pharynx", "Salivary glands", "Esophagus", "Stomach",
      "Duodeno-pancreas", "Small intestine and mesentery", "Colon",
      "Rectum and anal canal", "Liver and biliary tract",
      "Spleen and portal system", "Abdominal wall and weak points",
      "Peritoneum",
    ]
  },
  { key: "histology", name: "Histology", col: 0,
    courses: [
      "General overview of the digestive system", "Oral cavity", "Esophagus",
      "Gastric wall", "Intestinal wall", "Liver and biliary tract",
      "Exocrine pancreas",
    ]
  },
  { key: "physiology", name: "Physiology", col: 1,
    courses: [
      "General overview of digestive physiology", "Oro-esophageal phase",
      "Gastric physiology", "Bilio-pancreatic secretions",
      "Intestinal digestion and absorption", "Small intestine phase",
      "The colon", "TD — Tools for assessing dietary protein quality (CUD)",
    ]
  },
  { key: "biochemistry", name: "Biochemistry", col: 1,
    courses: ["Vitamins", "Trace elements"]
  },
];

const mod = createUnitModule(DATA);
export const allTopics = mod.allTopics;
export const makeId = mod.makeId;
