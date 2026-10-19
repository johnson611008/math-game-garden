export function fingerprint(question) {
  return JSON.stringify([question.unitId, question.station, question.taskType, question.expressionAst]);
}
