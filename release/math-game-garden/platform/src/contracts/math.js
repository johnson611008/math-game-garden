/**
 * @typedef {{numerator: string, denominator: string}} RationalJSON
 * @typedef {{radicand: string, coefficient: RationalJSON}} RadicalTermJSON
 * @typedef {{kind: 'radical-sum', terms: RadicalTermJSON[]}} RadicalValueJSON
 * @typedef {{type:'number',text:string}|{type:'unary',operator:'+'|'-',argument:MathAST}|{type:'sqrt',argument:MathAST}|{type:'binary',operator:'+'|'-'|'*'|'/',left:MathAST,right:MathAST}} MathAST
 *
 * Numerators and denominators are decimal integer strings, never approximate Numbers.
 * Zero has terms:[]; r=1 is rational. Terms sorted numerically, unique, nonzero coefficients.
 * AST nodes: number{text}, unary{operator,argument}, sqrt{argument}, binary{operator,left,right}.
 * AST and original response remain separate from normalized values; never use display text as equality.
 * Supported now: real square roots of rational expressions, monomial division, sums/products.
 * Unsupported: nested roots, variables, powers, complex numbers, multi-term divisors.
 */
export const MATH_SCHEMA_VERSION = 1;
