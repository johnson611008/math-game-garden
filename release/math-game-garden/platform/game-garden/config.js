import {units} from '../src/config/units.js';
export const games=Object.freeze([
 {name:'根式打地鼠',topic:'根式化簡',tag:'五關冒險・已開放',art:'../mole-demo/assets/peek.png',href:'../mole-formal/'},
 {name:'根式彈珠工坊',topic:'根式乘除',tag:'五關冒險・已開放',art:'../mole-formal/assets/trick-idle.png',symbol:'× ÷',href:'../marble-formal/'},
 {name:'根式泡泡派對',topic:'根式加減',tag:'五關冒險・已開放',art:'../mole-formal/assets/magic-idle.png',symbol:'+ −',href:'../bubble-formal/'},
 // These targets document destinations, not permission to enter. Keep href absent:
 // the existing release lock remains until a cross-unit authority is defined.
 {name:'根式水晶礦車',topic:'根式四則',tag:'尚未開放',art:'assets/cards/card-4-scene.png',scene:'assets/cards/card-4-scene.png',sceneAlt:'地鼠坐在礦車中，周圍有彩色水晶，後方為水晶礦坑',caption:'接住正確水晶，挑戰根式四則運算！',targetPath:'../crystal-cart-formal/'},
 {name:'拯救人質大作戰',topic:'分母有理化',tag:'尚未開放',art:'assets/cards/card-5-scene.png',scene:'assets/cards/card-5-scene.png',sceneAlt:'左側勇者地鼠、右側黑紅斗篷Boss，後方水晶城堡內的人質仍被囚禁',caption:'運用根式乘法公式，擊敗 Boss 救出人質！',targetPath:'../rescue-battle-formal/'},
].map(Object.freeze));
// Resolve the existing platform-relative entry, never a demo or alternate namespace.
const gardenUnits=units.map(u=>({...u,...({'addition-subtraction':{practiceHref:'./unit-three/'},'mixed-operations':{practiceHref:'./unit-four/'},'conjugate-rationalization':{title:'根式乘法公式與有理化',practiceHref:'./unit-five/'}}[u.id]||{})}));
export const practice=Object.freeze({units:Object.freeze(gardenUnits.filter(u=>u.practiceHref).map(u=>Object.freeze({title:u.title,href:'../'+u.practiceHref.replace(/^\.\//,'')}))),locked:Object.freeze(gardenUnits.filter(u=>!u.practiceHref).map(u=>u.title))});
