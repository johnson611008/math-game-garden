export const units = Object.freeze([
  { id: 'simplification', title: '根式化簡', subtitle: '含單項分母有理化', description: '從平方因數出發，認識最簡根式，讓根式變得清楚又簡潔。', availability: 'in-development', practiceHref: './practice/', gameTitle: '根式化簡工廠', stations: [
    { code: 'A', title: '平方因數分解機', description: '認識被開方數中的平方因數。' },
    { code: 'B', title: '最簡根式檢驗機', description: '檢視根式是否已化為最簡形式。' },
    { code: 'C', title: '單項分母有理化修復機', description: '探索移除分母根號的方法。' },
  ] },
  { id: 'multiplication-division', title: '根式乘除', subtitle: '乘法與除法', description: '探索根式相乘、相除與化簡之間的關係。', availability: 'unreleased', practiceHref: './unit-two/', gameTitle: null, stations: [] },
  { id: 'addition-subtraction', title: '根式加減', subtitle: '同類根式的合併', description: '辨認同類根式，再進行加法與減法。', availability: 'unreleased', gameTitle: null, stations: [] },
  { id: 'mixed-operations', title: '根式四則運算', subtitle: '整合運算順序', description: '結合化簡與四則運算，逐步整理算式。', availability: 'unreleased', gameTitle: null, stations: [] },
  { id: 'conjugate-rationalization', title: '雙項分母有理化', subtitle: '共軛式', description: '認識共軛式，探索雙項分母的有理化。', availability: 'unreleased', gameTitle: null, stations: [] },
].map(unit => Object.freeze({ ...unit, stations: Object.freeze(unit.stations.map(Object.freeze)) })));
