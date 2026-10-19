/**
 * @typedef {Object} Question
 * @property {1} schemaVersion
 * @property {string} id
 * @property {'simplification'} unitId
 * @property {'A'|'B'|'C'} station
 * @property {'simplify'|'largest-square-factor'|'judge-and-correct'|'rationalize-monomial-denominator'} taskType
 * @property {number} difficulty
 * @property {string} templateId
 * @property {number} templateVersion
 * @property {number} generatorVersion
 * @property {string} seed
 * @property {string} source
 * @property {{schemaVersion:1,type:'power-radical',factors:{base:number,exponent:number}[]}} [presentation]
 * @property {1} [challengeContractVersion] B1 additive contract; legacy evaluator still grades final expressions only.
 * @property {'unit-one-small-v1'} [difficultyPolicy]
 * @property {{schemaVersion:1,kind:'square-factor'|'decomposition-and-answer'|'judgment-and-correction'|'rationalization-bundle'}} [interactionSpec]
 * @property {import('./math.js').MathAST} expressionAst
 * @property {string} instruction
 * @property {'expression'|'judgment-and-expression'} responseSchema
 * @property {{expectedValue:import('./math.js').RadicalValueJSON,requiredForm:'simplest-monomial',isSimplest?:boolean}} answerSpec
 * @property {string[]} conceptTags
 * @property {number[]} hintPlan
 * @property {string[]} solutionSteps
 * @property {{radicand:string,requirement:'valid-square-factor'|'largest-square-factor'}} [decompositionSpec]
 * @property {{numerator:string,denominator:string,multiplierExample:string}} [stepSpec]
 *
 * Question v1: id, unitId, station A/B/C, taskType, difficulty 1..3, templateId,
 * templateVersion, generatorVersion, seed, source, expressionAst, instruction,
 * responseSchema, answerSpec{expectedValue,requiredForm,isSimplest?}, conceptTags,
 * hintPlan, solutionSteps, decompositionSpec?, stepSpec?.
 * A tasks distinguish largest-square-factor from simplify; intermediate decompositions
 * are evaluated by evaluateSquareDecomposition and are not automatically final submissions.
 * B response: {isSimplest:boolean, correctedAnswer?:string}; correction required for false.
 * C response: {answer:string}; stepSpec provides numerator/denominator for separate math checks.
 * No Question contains DOM elements or engine functions. JSON serialization is lossless.
 * Optional presentation v1 is additive: bounded positive integer powers are displayed
 * as superscripts; source/expressionAst retain their exact expanded integer value.
 * Student input grammar does not accept ^. Old snapshots without presentation remain valid.
 */
export const QUESTION_SCHEMA_VERSION = 1;
