// Presentation registration only. The R3/R4 collision box and motion are untouched.
// Source landmarks: alpha >= 16 in the cart/wheel region y >= 500.
export const RIDERS=Object.freeze({
 normal:Object.freeze({file:'mole_cart_normal.png',centerX:434,groundY:747,bounds:[123,4,745,747],alt:'地鼠坐在礦車內'}),
 happy:Object.freeze({file:'mole_cart_happy.png',centerX:391.5,groundY:750,bounds:[83,6,700,750],alt:'地鼠開心收集水晶'}),
 surprised:Object.freeze({file:'mole_cart_surprised.png',centerX:338.5,groundY:747,bounds:[28,4,649,747],alt:'地鼠驚訝，準備再次挑戰'})
});
export const CANVAS=768,VISIBLE_WIDTH_RATIO=.82;
export function riderMood(phase){return phase==='correct'?'happy':['breaking','hint','timeout'].includes(phase)?'surprised':'normal';}
export function riderView(phase){const mood=riderMood(phase),r=RIDERS[mood];return{mood,src:'assets/rider/'+r.file,alt:r.alt,scale:VISIBLE_WIDTH_RATIO*CANVAS/(r.bounds[2]-r.bounds[0]),anchorX:r.centerX/CANVAS,anchorY:r.groundY/CANVAS};}
// Used for deterministic geometry checks; units are rendered CSS pixels.
export function riderMetrics(mood,cartWidth){const r=RIDERS[mood],s=cartWidth*VISIBLE_WIDTH_RATIO/(r.bounds[2]-r.bounds[0]);return{left:(r.bounds[0]-r.centerX)*s,right:(r.bounds[2]-r.centerX)*s,top:(r.bounds[1]-r.groundY)*s,bottom:(r.bounds[3]-r.groundY)*s,centerX:0,wheelBaseline:0,spriteWidth:CANVAS*s};}
