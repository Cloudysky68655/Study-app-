// Shared by every unit's data file (src/lib/unitData/*.js). Each of those
// files just defines its own DATA array (subjects/courses) and calls
// createUnitModule(DATA) to get the same allTopics()/makeId() behavior
// topicData.js implements directly — keeps the row/id logic in one place
// instead of copy-pasted six times.

function rowsFor(course) {
  if (typeof course === "string") return [{ name: course, sub: false }];
  return [{ name: course.name, sub: false }, ...course.subs.map((x) => ({ name: x, sub: true }))];
}

export function createUnitModule(DATA) {
  function makeId(subjectKey, courseIdx, rowIdx) {
    return `${subjectKey}-${courseIdx}-${rowIdx}`;
  }

  function allTopics() {
    const out = [];
    DATA.forEach((s) =>
      s.courses.forEach((c, ci) =>
        rowsFor(c).forEach((r, ri) =>
          out.push({ ...r, id: makeId(s.key, ci, ri), subject: s.name, subjectKey: s.key })
        )
      )
    );
    return out;
  }

  return { DATA, allTopics, makeId };
}
