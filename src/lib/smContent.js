// Mock content for the Silent Moon UI reconstruction (Phase 1).
// This is intentionally disconnected from the real app's Supabase
// data — Phase 1 is a visual reconstruction only. Phase 2 will
// decide how/whether real data maps into these shapes.

export const CATEGORIES = [
  { slug: "reduce-stress", title: "Reduce Stress", img: "/sm/illustrations/topic-reduce-stress.png", ratio: "310/365", col: 0 },
  { slug: "improve-performance", title: "Improve Performanee", img: "/sm/illustrations/topic-improve-perf.png", ratio: "308/288", col: 1 },
  { slug: "increase-happiness", title: "Increase Happiness", img: "/sm/illustrations/topic-increase-happiness.png", ratio: "312/291", col: 0 },
  { slug: "reduce-anxiety", title: "Reduce Anxiety", img: "/sm/illustrations/topic-reduce-anxiety.png", ratio: "308/362", col: 1 },
  { slug: "personal-growth", title: "Personal Growth", img: "/sm/illustrations/topic-personal-growth.png", ratio: "312/335", col: 0 },
  { slug: "better-sleep", title: "Better Sleep", img: "/sm/illustrations/topic-better-sleep.png", ratio: "352/373", col: 1 },
];

export const RECOMMENDED = [
  { slug: "focus", title: "Focus", sub: "MEDITATION · 3-10 MIN", img: "/sm/illustrations/home-tile-focus.png" },
  { slug: "happiness", title: "Happiness", sub: "MEDITATION · 3-10 MIN", img: "/sm/illustrations/home-tile-happiness.png" },
];

export const SLEEP_TRACKS = [
  { slug: "night-island", title: "Night Island", sub: "45 MIN · SLEEP MUSIC", img: "/sm/illustrations/tile-night-island.png", theme: "navy", duration: "45:00" },
  { slug: "sweet-sleep", title: "Sweet Sleep", sub: "45 MIN · SLEEP MUSIC", img: "/sm/illustrations/tile-sweet-sleep.png", theme: "navy", duration: "45:00" },
  { slug: "good-night", title: "Good Night", sub: "45 MIN · SLEEP MUSIC", img: "/sm/illustrations/tile-good-night.png", theme: "navy", duration: "45:00" },
  { slug: "moon-clouds", title: "Moon Clouds", sub: "45 MIN · SLEEP MUSIC", img: "/sm/illustrations/tile-moon-clouds.png", theme: "navy", duration: "45:00" },
];

export const MEDITATE_COURSES = [
  { slug: "7-days-of-calm", title: "7 Days of Calm", sub: "COURSE", img: "/sm/illustrations/tile-7days-calm.png", theme: "cream" },
  { slug: "anxiety-release", title: "Anxiet Release", sub: "COURSE", img: "/sm/illustrations/tile-anxiety-release.png", theme: "cream" },
];

export const COURSE_DETAILS = {
  "happy-morning": {
    title: "Happy Morning",
    kind: "COURSE",
    heroImg: "/sm/illustrations/header-happy-morning.png",
    desc: "Ease the mind into a restful night's sleep with these deep, amblent tones.",
    favorites: "24.234",
    listening: "34.234",
    theme: "light",
    lessons: [
      { title: "Focus Attention", duration: "10 MIN" },
      { title: "Body Scan", duration: "5 MIN" },
      { title: "Making Happiness", duration: "3 MIN" },
    ],
  },
  focus: {
    title: "Focus",
    kind: "MEDITATION",
    heroImg: "/sm/illustrations/home-tile-focus.png",
    desc: "we can learn how to recognize when our minds are doing their normal everyday acrobatics.",
    favorites: "18.412",
    listening: "27.903",
    theme: "light",
    lessons: [
      { title: "Focus Attention", duration: "10 MIN" },
      { title: "Body Scan", duration: "5 MIN" },
      { title: "Making Happiness", duration: "3 MIN" },
    ],
  },
  happiness: {
    title: "Happiness",
    kind: "MEDITATION",
    heroImg: "/sm/illustrations/home-tile-happiness.png",
    desc: "we can learn how to recognize when our minds are doing their normal everyday acrobatics.",
    favorites: "21.055",
    listening: "31.220",
    theme: "light",
    lessons: [
      { title: "Focus Attention", duration: "10 MIN" },
      { title: "Body Scan", duration: "5 MIN" },
      { title: "Making Happiness", duration: "3 MIN" },
    ],
  },
  "7-days-of-calm": {
    title: "7 Days of Calm",
    kind: "COURSE",
    heroImg: "/sm/illustrations/tile-7days-calm.png",
    desc: "we can learn how to recognize when our minds are doing their normal everyday acrobatics.",
    favorites: "24.234",
    listening: "34.234",
    theme: "light",
    lessons: [
      { title: "Focus Attention", duration: "10 MIN" },
      { title: "Body Scan", duration: "5 MIN" },
      { title: "Making Happiness", duration: "3 MIN" },
    ],
  },
  "anxiety-release": {
    title: "Anxiet Release",
    kind: "COURSE",
    heroImg: "/sm/illustrations/tile-anxiety-release.png",
    desc: "we can learn how to recognize when our minds are doing their normal everyday acrobatics.",
    favorites: "16.874",
    listening: "22.501",
    theme: "light",
    lessons: [
      { title: "Focus Attention", duration: "10 MIN" },
      { title: "Body Scan", duration: "5 MIN" },
      { title: "Making Happiness", duration: "3 MIN" },
    ],
  },
};

export const TRACK_DETAILS = {
  "night-island": {
    title: "Night Island",
    kind: "45 MIN · SLEEP MUSIC",
    heroImg: "/sm/illustrations/header-night-island-detail.png",
    desc: "Ease the mind into a restful night's sleep with these deep, amblent tones.",
    favorites: "24.234",
    listening: "34.234",
    theme: "dark",
    duration: "45:00",
    related: [
      { slug: "moon-clouds", title: "Moon Clouds", sub: "45 MIN · SLEEP MUSIC", img: "/sm/illustrations/tile-moon-clouds.png" },
      { slug: "sweet-sleep", title: "Sweet Sleep", sub: "45 MIN · SLEEP MUSIC", img: "/sm/illustrations/tile-sweet-sleep.png" },
    ],
  },
  "focus-attention": {
    title: "Focus Attention",
    kind: "7 DAYS OF CALM",
    theme: "light",
    duration: "45:00",
  },
};
