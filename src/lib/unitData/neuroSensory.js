import { createUnitModule } from "@/lib/unitDataFactory";

export const DATA = [
  { key: "anatomy", name: "Anatomy", col: 0,
    courses: [
      "Skull osteology", "Facial osteology", "Temporomandibular joint (TMJ)",
      "Nasal cavities and paranasal sinuses", "Spine and hyoid bone",
      "Spinal cord", "Brainstem", "Diencephalon", "Telencephalon",
      "Cerebellum and meninges", "Carotid system", "Brain vascularization",
      "Venous and lymphatic drainage of the head and neck",
      "Platysma muscle and facial nerve",
      "The visual apparatus and oculomotor nerves",
      "The auditory apparatus and nerve VIII",
      "Anatomy of the trigeminal nerve", "Nerves IX, X, XI, XII",
    ]
  },
  { key: "histology", name: "Histology", col: 0,
    courses: [
      "General overview of nervous organs and spinal cord",
      "Cerebral cortex and choroid plexus", "Nerve ganglia", "The cerebellum",
      "General overview of sensory organs and hearing",
      "Organ of balance (vestibular)", "Organ of taste", "Organ of smell",
      "Organ of vision", "Skin and somesthesia receptors",
    ]
  },
  { key: "physiology", name: "Physiology", col: 1,
    courses: [
      "Physiology of peripheral receptors",
      "Spinal roots and conduction functions", "Spinal reflexes",
      "Spinal and supraspinal regulation of spinal reflexes",
      "The cerebellum", "Basal ganglia", "Motor cortex",
      "Physiology of somesthesia", "Pain", "Hearing", "Vision",
      "Wakefulness and sleep", "TD — EEG", "TD — EMG",
    ]
  },
  { key: "biophysics", name: "Biophysics", col: 1,
    courses: ["Visual apparatus (biophysics)", "Auditory apparatus (biophysics)"]
  },
];

const mod = createUnitModule(DATA);
export const allTopics = mod.allTopics;
export const makeId = mod.makeId;
