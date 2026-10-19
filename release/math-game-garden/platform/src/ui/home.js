import { practicePolicy, unitOneChallengePolicy } from '../config/policies.js';

// All interpolated copy comes from trusted, static project configuration.
export function renderHome(root, units) {
  root.innerHTML = `
    <section class="hero" aria-labelledby="welcome-title">
      <div><p class="eyebrow">RADICAL ADVENTURE PARK / 學習大廳</p>
        <h1 id="welcome-title">把每一次化簡，<br>變成一次新發現。</h1>
        <p class="hero-copy">五個單元，從根式化簡走向共軛式。未來可以自主練習，也可以走進遊戲挑戰，依自己的步調累積理解。</p>
        <a class="explore-link" href="#units">探索五個學習單元 <span aria-hidden="true">↓</span></a>
      </div><div class="hero-art" aria-hidden="true"><span class="orbit">根式的世界</span><span class="radical">√</span><span class="art-label">觀察 · 化簡 · 理解</span></div>
    </section>
    <aside class="notice"><strong>第一單元自主練習已開放</strong><span>每回合十題，精確判定答案，保存本機紀錄並提供錯題回顧；不影響遊戲資格。請留意頁面下方的保存狀態。</span></aside>
    <section id="units" aria-labelledby="units-title"><div class="section-heading"><div><p class="eyebrow">YOUR LEARNING MAP</p><h2 id="units-title">選一站，認識下一段旅程</h2></div><span>5 個學習單元</span></div>
      <div class="unit-grid">${units.map((unit, index) => {
        const first = unit.availability === 'in-development';
        const label = first ? '開發中' : '尚未開放';
        return `<article class="unit-card ${first ? 'featured' : ''}" aria-labelledby="unit-${unit.id}">
          <div class="card-top"><span class="unit-number">單元 ${String(index + 1).padStart(2, '0')}</span><span class="status ${first ? 'developing' : ''}">${unit.practiceHref ? '自主練習已開放' : label}</span></div>
          <h3 id="unit-${unit.id}">${unit.title}</h3><p class="subtitle">${unit.subtitle}</p><p class="description">${unit.description}</p>
          ${first ? `<div class="factory"><h4>${unit.gameTitle} <small>工作站規劃</small></h4><ul>${unit.stations.map(station => `<li><span class="station-code">${station.code}</span><div><strong>${station.title}</strong><p>${station.description}</p></div></li>`).join('')}</ul></div>` : ''}
          <div class="entry-list" aria-label="${unit.title}入口狀態"><div class="entry"><div><strong>自主練習</strong><small>每回合 ${practicePolicy.questionCount} 題 · 可無限次練習</small></div>${unit.practiceHref ? `<a class="practice-entry" href="${unit.practiceHref}">開始／繼續練習 →</a>` : `<span>${label}</span>`}</div><div class="entry"><div><strong>遊戲挑戰</strong><small>${first ? `${unit.gameTitle} · ${unitOneChallengePolicy.questionCount} 題` : '挑戰內容待後續開放'}</small></div><span>${label}</span></div></div>
        </article>`;
      }).join('')}</div>
    </section>
    <section class="rules" aria-labelledby="rules-title"><div><p class="eyebrow">練習已開放 / 挑戰機制尚未啟用</p><h2 id="rules-title">練習有彈性，挑戰有準備</h2><p>自主練習沒有通關門檻；以下遊戲規則仍在規劃，不會因練習成績鎖定資格。</p></div><ol><li><strong>自主練習</strong>每回合 10 題，可無限次重練。</li><li><strong>工廠挑戰（尚未開放）</strong>14 題中，首次作答正確至少 11 題才通關。</li><li><strong>補救後再挑戰（尚未啟用）</strong>未達標須完成 10 題補救，至少答對 8 題才能再次挑戰。</li></ol><p class="state-note">「尚未開放」表示功能未推出；「補救中，暫時鎖定」則是未來個人學習狀態，兩者分開管理。</p></section>`;
}
