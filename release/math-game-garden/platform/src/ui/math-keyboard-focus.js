// Presentation only: never changes answers, grading or stored records.
export function mountMathKeyboard(root, inputs, keypad) {
  const fields = [...inputs];
  for (const input of fields) input.setAttribute('inputmode', 'none');
  const doc = root.ownerDocument?.createElement ? root.ownerDocument : root;
  const toggle = doc.createElement('button');
  toggle.type = 'button'; toggle.className = 'keyboard-mode';
  toggle.textContent = '使用系統鍵盤'; toggle.setAttribute('aria-pressed', 'false');
  toggle.setAttribute('aria-label', '切換系統鍵盤；也可直接使用實體鍵盤');
  keypad.after(toggle);
  let last = fields[0], touch = false;
  const focus = e => { if (fields.includes(e.target)) last = e.target; };
  const pointer = e => {
    if (!e.target.closest('button[data-symbol]')) return;
    touch = e.pointerType === 'touch' || e.pointerType === 'pen';
    e.preventDefault();
  };
  const key = () => { touch = false; };
  root.addEventListener('focusin', focus);
  keypad.addEventListener('pointerdown', pointer);
  keypad.addEventListener('keydown', key);
  toggle.onclick = () => {
    const system = toggle.getAttribute('aria-pressed') !== 'true';
    for (const input of fields) input.setAttribute('inputmode', system ? 'text' : 'none');
    toggle.setAttribute('aria-pressed', String(system));
    toggle.textContent = system ? '使用數學鍵盤' : '使用系統鍵盤';
    if (system && last && !last.disabled) last.focus({preventScroll: true});
    else if (last === doc.activeElement) last.blur();
  };
  return {
    restore(input, caret) {
      if (!touch) input.focus({preventScroll: true});
      else if (doc.activeElement === input) input.blur();
      input.setSelectionRange(caret, caret);
    },
    dispose() { root.removeEventListener('focusin', focus); keypad.removeEventListener('pointerdown', pointer); keypad.removeEventListener('keydown', key); toggle.remove(); },
  };
}
