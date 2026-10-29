// Shared A0 story and A1 asset declarations. Playable state lives in battle.mjs.
export const CONTENT=Object.freeze({
 chapter:'第五關｜最終決戰',title:'《拯救人質大作戰》',
 story:Object.freeze([
  '邪惡地鼠抓走了地鼠勇者心儀的對象，將她囚禁在水晶城堡深處。',
  '為了救出心愛的朋友，地鼠勇者決定挺身而出，與邪惡地鼠展開最後決戰！',
  '玩家必須運用根式乘法公式破解魔法，才能擊敗邪惡地鼠，完成救援。'
 ]),
 rules:Object.freeze(['雙方各10滴血。','共10題根式運算。','答對敵人失去1滴血。','答錯主角失去1滴血。','必須完成全部10題。','主角最後至少剩下7滴血才算救援成功。','未達標須進入指定補救練功區。','補救達標後才能重新挑戰。']),
 limitation:'A1獨立體驗：進度只留在本頁；沒有正式保存、指定補救或重挑資格。重新整理會回到開場。',
 artStatus:'紫藍水晶城堡決戰；背景固定人質與牢籠已局部移除，畫面使用可獨立解除的分層牢籠。'
});
export const ASSETS=Object.freeze({hero:'assets/characters/hero_mole.png',defeated:'assets/characters/hero_mole_defeated.png',villain:'assets/evil_mole_boss.png',girl:'assets/characters/beautiful_mole.png',cage:'assets/characters/rescue_cage.png',background:'assets/crystal-castle-battle-clean.png',crystal:'assets/crystal.png'});
