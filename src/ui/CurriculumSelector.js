'use strict';
const { contains } = require('./HanziLayout');

function getCurriculumSelectionLayout(width, height) {
  const panelWidth = Math.min(352, width - 32);
  const panelHeight = 422;
  const panel = { x: (width - panelWidth) / 2, y: Math.max(118, (height - panelHeight) / 2), width: panelWidth, height: panelHeight };
  const x = panel.x + 18;
  const contentWidth = panel.width - 36;
  const gap = 8;
  const grades = Array.from({ length: 6 }, (_, i) => ({
    grade: i + 1, label: '一二三四五六'[i] + '年级',
    x: x + (i % 3) * ((contentWidth - 2 * gap) / 3 + gap),
    y: panel.y + 94 + Math.floor(i / 3) * 50, width: (contentWidth - 2 * gap) / 3, height: 42
  }));
  const semesters = [1, 2].map((semester) => ({ semester, label: semester === 1 ? '上学期' : '下学期',
    x: x + (semester - 1) * ((contentWidth - gap) / 2 + gap), y: panel.y + 206, width: (contentWidth - gap) / 2, height: 42 }));
  return { panel, grades, semesters,
    start: { x, y: panel.y + 310, width: contentWidth, height: 48 },
    back: { x, y: panel.y + 366, width: contentWidth, height: 38 } };
}

function findCurriculumAction(width, height, point) {
  if (!point) return null;
  const layout = getCurriculumSelectionLayout(width, height);
  const grade = layout.grades.find((button) => contains(button, point));
  if (grade) return { type: 'grade', value: grade.grade };
  const semester = layout.semesters.find((button) => contains(button, point));
  if (semester) return { type: 'semester', value: semester.semester };
  if (contains(layout.start, point)) return { type: 'start' };
  if (contains(layout.back, point)) return { type: 'back' };
  return null;
}
module.exports = { getCurriculumSelectionLayout, findCurriculumAction };
