import {units} from '../src/config/units.js';
export const games=Object.freeze([
 {name:'根式打地鼠',topic:'根式化簡',tag:'五關冒險・已開放',art:'../mole-demo/assets/peek.png',href:'../mole-formal/'},
 {name:'根式彈珠工坊',topic:'根式乘除',tag:'五關冒險・已開放',art:'../mole-formal/assets/trick-idle.png',symbol:'× ÷',href:'../marble-formal/'},
 {name:'根式泡泡派對',topic:'根式加減',tag:'五關冒險・已開放',art:'../mole-formal/assets/magic-idle.png',symbol:'+ −',href:'../bubble-formal/'},
 {name:'根式方塊王國',topic:'根式四則',tag:'敬請期待',art:'../mole-formal/assets/armor-idle.png',symbol:'( ) × +'},
 {name:'根式消除研究所',topic:'分母有理化',tag:'敬請期待',art:'../mole-formal/assets/king-idle.png',symbol:'1 / √2'},
].map(Object.freeze));
// Resolve the existing platform-relative entry, never a demo or alternate namespace.
const gardenUnits=units.map(u=>u.id==='addition-subtraction'?{...u,practiceHref:'./unit-three/'}:u);
export const practice=Object.freeze({units:Object.freeze(gardenUnits.filter(u=>u.practiceHref).map(u=>Object.freeze({title:u.title,href:'../'+u.practiceHref.replace(/^\.\//,'')}))),locked:Object.freeze(gardenUnits.filter(u=>!u.practiceHref).map(u=>u.title))});
