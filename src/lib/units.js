import * as cardioRespiratory from "@/lib/topicData";
import * as digestive from "@/lib/unitData/digestive";
import * as urinary from "@/lib/unitData/urinary";
import * as endocrine from "@/lib/unitData/endocrine";
import * as neuroSensory from "@/lib/unitData/neuroSensory";
import * as immunology from "@/lib/unitData/immunology";
import * as genetics from "@/lib/unitData/genetics";

/**
 * Every study unit the app knows about. To add a new unit once you have
 * its real content:
 *   1. Build its own data file the same way src/lib/topicData.js works
 *      (a DATA array of subjects/courses, plus allTopics()/makeId()).
 *   2. Import it here and add an entry below.
 * Nothing else in the app needs to change — the dashboard, schedule
 * builder, heatmap, and study time trends all just consume whatever
 * `topics` array the active unit hands them.
 */
export const UNITS = [
  {
    key: "cardio-respiratory",
    name: "Cardio-Respiratory",
    subtitle: "Unit 01",
    module: cardioRespiratory,
  },
  {
    key: "digestive",
    name: "Digestive System",
    subtitle: "Unit 02",
    module: digestive,
    premium: true,
  },
  {
    key: "urinary",
    name: "Urinary System",
    subtitle: "Unit 03",
    module: urinary,
    premium: true,
  },
  {
    key: "endocrine",
    name: "Endocrine System",
    subtitle: "Unit 04",
    module: endocrine,
    premium: true,
  },
  {
    key: "neuro-sensory",
    name: "Neuro-Sensory System",
    subtitle: "Unit 05",
    module: neuroSensory,
    premium: true,
  },
  {
    key: "immunology",
    name: "Immunology",
    subtitle: "Module",
    module: immunology,
    premium: true,
  },
  {
    key: "genetics",
    name: "Genetics",
    subtitle: "Module",
    module: genetics,
    premium: true,
  },
];

export function getUnit(key) {
  return UNITS.find((u) => u.key === key) || null;
}

export function getUnitTopics(key) {
  const unit = getUnit(key);
  return unit ? unit.module.allTopics() : [];
}

export function getUnitData(key) {
  const unit = getUnit(key);
  return unit ? unit.module.DATA : [];
}

// A unit is locked if it's marked premium and the user's unlocked list
// (from user_settings.premium_units) doesn't include its key or 'all'.
export function isUnitLocked(unit, premiumUnits) {
  if (!unit?.premium) return false;
  const owned = premiumUnits || [];
  return !(owned.includes(unit.key) || owned.includes("all"));
}
