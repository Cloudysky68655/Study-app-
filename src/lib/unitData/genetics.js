import { createUnitModule } from "@/lib/unitDataFactory";

export const DATA = [
  { key: "genetics", name: "Genetics", col: 0,
    courses: [
      "Introduction to the study of genetics",
      "Reminder of nucleic acid structures",
      "Genome organization", "Structure and organization of chromatin",
      "DNA replication in prokaryotes and eukaryotes", "Transcription",
      "Genetic code and translation",
      "Regulation of gene expression and epigenetics",
      "Genetic variations and DNA repair",
      "Molecular biology tools",
      "Modes of transmission of monogenic diseases",
      "Non-conventional heredity", "Cancer genetics",
      "Population genetics: basic concepts", "Normal karyotype",
      "Karyotype abnormalities", "Gene therapy and pharmacogenetics",
      "Chromosomal diseases", "Genetic counseling",
    ]
  },
];

const mod = createUnitModule(DATA);
export const allTopics = mod.allTopics;
export const makeId = mod.makeId;
