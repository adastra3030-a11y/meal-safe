const $ = selector => document.querySelector(selector);
const STORAGE_KEY = 'meal-safe-github-pages-v1';
const common = ['牛奶','鸡蛋','花生','坚果','大豆','小麦','麸质','芝麻','甲壳类','鱼类'];
const defaultState = { started: false, allergies: [], meals: [] };
let state = read();
let activeDate = today();

function read() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
      ...defaultState,
      ...saved,
      allergies: Array.isArray(saved.allergies) ? saved.allergies : [],
      meals: Array.isArray(saved.meals) ? saved.meals : []
    };
  } catch { return { ...defaultState }; }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function formatISO(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function today() { return formatISO(new Date()); }
function addDay(day, amount) { const date = new Date(`${day}T00:00:00`); date.setDate(date.getDate() + amount); return formatISO(date); }
function label(day) { const date = new Date(`${day}T00:00:00`), diff = Math.round((date - new Date(`${today()}T00:00:00`)) / 86400000); return `${diff === 0 ? '今天 · ' : diff === -1 ? '昨天 · ' : ''}${date.getMonth()+1}月${date.getDate()}日 周${'日一二三四五六'[date.getDay()]}`; }
function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
function hits(meal) { const source = `${meal.name} ${meal.ingredientsText || ''}`.toLowerCase(); return state.allergies.filter(item => source.includes(item.toLowerCase())); }
function mealsForDay() { return state.meals.filter(item => item.date === activeDate).sort((a, b) => a.time.localeCompare(b.time)); }
function setView() { $('#welcome').classList.toggle('hidden', state.started); $('#home').classList.toggle('hidden', !state.started); }
function getWeek() { return Array.from({ length: 7 }, (_, index) => addDay(today(), index - 6)); }
function renderStats() {
  const all = state.meals;
  const alertCount = all.filter(item => hits(item).length).length;
  $('#stats-total').textContent = all.length;
  $('#stats-safe').textContent = all.length - alertCount;
  $('#stats-alert').textContent = alertCount;
  const week = getWeek();
  const highest = Math.max(1, ...week.map(day => all.filter(item => item.date === day).length));
  $('#week-bars').innerHTML = week.map(day => {
    const count = all.filter(item => item.date === day).length;
    const date = new Date(`${day}T00:00:00`);
    const height = count ? Math.max(14, Math.round(count / highest * 52)) : 5;
    return `<div class="day-bar" title="${date.getMonth() + 1}月${date.getDate()}日：${count} 餐"><span class="bar" style="height:${height}px"></span><b>${count}</b><small>${'日一二三四五六'[date.getDay()]}</small></div>`;
  }).join('');
  $('#stats-note').textContent = all.length ? `近 7 天共记录 ${week.reduce((sum, day) => sum + all.filter(item => item.date === day).length, 0)} 餐；“需留意”会按当前过敏原设置重新核查。` : '开始记录后，这里会显示近 7 天的餐食情况。';
}
function render() {
  setView();
  if (!state.started) return;
  $('#date-label').textContent = label(activeDate);
  const meals = mealsForDay(), alerts = meals.filter(item => hits(item).length);
  $('#count-all').textContent = meals.length; $('#count-safe').textContent = meals.length - alerts.length;
  $('#safety').classList.toggle('alert', alerts.length > 0); $('#safety-icon').textContent = alerts.length ? '!' : '✓';
  $('#safety-title').textContent = alerts.length ? `有 ${alerts.length} 餐需要留意` : meals.length ? '今天的餐食很安全' : '今天还没有餐食记录';
  $('#safety-copy').textContent = alerts.length ? '其中含有你设置的过敏原，请再次确认。' : meals.length ? '已记录的食物未包含你的过敏原。' : '记录一餐后，会在这里检查你的过敏原。';
  const list = $('#meal-list');
  list.innerHTML = meals.length ? meals.map(item => { const match = hits(item); return `<article class="meal"><div class="meal-top"><span class="meal-type">${escapeHTML(item.type)}</span><span>${escapeHTML(item.time)}</span></div><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.ingredientsText || '未添加食材说明')}</p><span class="status ${match.length ? 'alert' : ''}">${match.length ? `注意：${escapeHTML(match.join('、'))}` : '✓ 安心食用'}</span><button class="delete-meal" data-id="${item.id}">删除</button></article>`; }).join('') : '<div class="empty"><strong>今天还没有记录</strong>从第一餐开始，慢慢累积自己的饮食地图。</div>';
  renderStats();
}
function defaultType() { const hour = new Date().getHours(); return hour < 10 ? '早餐' : hour < 15 ? '午餐' : hour < 21 ? '晚餐' : '加餐'; }
function showMeal() { const now = new Date(); $('#meal-type').value = defaultType(); $('#meal-time').value = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`; $('#meal-name').value = ''; $('#meal-ingredients').value = ''; updatePreview(); $('#meal-dialog').showModal(); }
function updatePreview() { const match = hits({ name: $('#meal-name').value, ingredientsText: $('#meal-ingredients').value }); const box = $('#match-preview'); box.classList.toggle('alert', match.length > 0); box.innerHTML = match.length ? `! 发现过敏原：<strong>${escapeHTML(match.join('、'))}</strong>，请确认是否适合食用。` : '◎ 填写食材后，会在这里检查你的过敏原。'; }
function renderAllergens() { $('#common-allergens').innerHTML = common.map(item => `<button type="button" class="chip ${state.allergies.includes(item) ? 'active' : ''}" data-allergen="${item}">${state.allergies.includes(item) ? '✓' : '＋'} ${item}</button>`).join(''); $('#selected-allergens').innerHTML = state.allergies.length ? state.allergies.map(item => `<span class="chip">${escapeHTML(item)} <button type="button" data-remove="${escapeHTML(item)}" aria-label="移除 ${escapeHTML(item)}">×</button></span>`).join('') : '<span class="dialog-note">暂未添加</span>'; }
function saveMeal(event) { event.preventDefault(); const name = $('#meal-name').value.trim(); if (!name) return toast('请填写吃了什么'); state.meals.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, date: activeDate, type: $('#meal-type').value, time: $('#meal-time').value, name, ingredientsText: $('#meal-ingredients').value.trim() }); persist(); $('#meal-dialog').close(); render(); toast('已记录这一餐'); }
function saveAllergies(event) { event.preventDefault(); persist(); $('#settings-dialog').close(); render(); toast('过敏原已保存'); }
function toast(message) { const item = document.createElement('div'); item.className = 'toast'; item.textContent = message; document.body.append(item); setTimeout(() => item.remove(), 2200); }

$('#start-button').onclick = () => { state.started = true; persist(); render(); };
$('#open-meal').onclick = showMeal; $('#meal-form').onsubmit = saveMeal; $('#meal-name').oninput = updatePreview; $('#meal-ingredients').oninput = updatePreview;
$('#prev-day').onclick = () => { activeDate = addDay(activeDate, -1); render(); }; $('#next-day').onclick = () => { activeDate = addDay(activeDate, 1); render(); }; $('#date-button').onclick = () => $('#date-input').showPicker(); $('#date-input').onchange = event => { activeDate = event.target.value; render(); };
$('#open-settings').onclick = () => { renderAllergens(); $('#settings-dialog').showModal(); }; $('#settings-form').onsubmit = saveAllergies;
$('#add-allergen').onclick = () => { const field = $('#custom-allergen'), item = field.value.trim(); if (item && !state.allergies.includes(item)) { state.allergies.push(item); field.value = ''; renderAllergens(); } else if (!item) { toast('请输入过敏原名称'); } };
document.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  const close = target.dataset.close;
  if (close) { $('#' + close).close(); return; }
  const allergen = target.dataset.allergen;
  if (allergen) { state.allergies = state.allergies.includes(allergen) ? state.allergies.filter(item => item !== allergen) : [...state.allergies, allergen]; renderAllergens(); return; }
  const remove = target.dataset.remove;
  if (remove) { state.allergies = state.allergies.filter(item => item !== remove); renderAllergens(); return; }
  const mealId = target.dataset.id;
  if (mealId && target.classList.contains('delete-meal')) { state.meals = state.meals.filter(item => item.id !== mealId); persist(); render(); toast('已删除这条餐食记录'); }
});
render();
