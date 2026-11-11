(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const { t, language } = window.BirthdayI18n;
  const state = { invited: false, completed: new Set(), flower: 'pink', name: '', wish: '' };
  const flowers = { pink: t('粉色的心动'), white: t('纯白的约定'), lavender: t('紫色的小秘密') };
  const defaultWish = t('生日快乐，爱莉。愿你永远自由、闪耀，被世界温柔以待。');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ritualOrder = ['flowers', 'candles', 'wish'];
  const nextLabels = { flowers: t('先挑一束喜欢的花'), candles: t('让生日烛光亮起来'), wish: t('留一句只属于你的心意') };
  const nextRitual = () => ritualOrder.find(item => !state.completed.has(item));
  const motifs = window.ElysiaMotifs;
  const ceremony = window.BirthdayCeremony;
  let activeView = 'invitation';
  let navigating = false;
  let queuedView = null;
  let draftFlower = 'pink';
  let toastTimeout;
  let cardTimer;
  let artPromise;
  const music = $('birthday-music');
  music.volume = 0.28;

  function toast(message) {
    clearTimeout(toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('is-visible');
    toastTimeout = setTimeout(() => $('toast').classList.remove('is-visible'), 3600);
  }

  async function showView(name) {
    if ((name === 'room' && !state.invited) || (name === 'letter' && state.completed.size !== 3)) return;
    const target = $(name);
    if (!target?.classList.contains('view')) return;
    if (navigating) { queuedView = name; return; }
    if (activeView === name) return;
    const previous = $(activeView);
    const animations = [];
    navigating = true;
    document.body.dataset.switching = 'true';
    $('main').setAttribute('aria-busy', 'true');
    ceremony.clear();
    const change = () => {
      if ($('ritual-dialog').open) $('ritual-dialog').close();
      for (const view of document.querySelectorAll('.view')) {
        const active = view.id === name;
        view.hidden = !active;
        view.classList.toggle('is-active', active);
      }
      for (const chapter of document.querySelectorAll('.chapter')) {
        const active = chapter.dataset.view === name;
        chapter.classList.toggle('is-active', active);
        if (active) chapter.setAttribute('aria-current', 'step');
        else chapter.removeAttribute('aria-current');
      }
      activeView = name;
      document.body.dataset.view = name;
      window.scrollTo({ top: 0, behavior: 'instant' });
      $(`${name}-title`).focus({ preventScroll: true });
    };
    try {
      if (reducedMotion.matches) change();
      else if (document.startViewTransition) {
        const transition = document.startViewTransition(change);
        await transition.finished;
      } else {
        const exit = previous.animate([{ opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-8px)' }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
        animations.push(exit);
        await exit.finished;
        change();
        const enter = target.animate([{ opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' }], { duration: 440, easing: 'cubic-bezier(.2,.7,.2,1)' });
        animations.push(enter);
        await enter.finished;
      }
    } catch (error) {
      // A skipped browser transition still commits the requested destination.
      if (activeView !== name) change();
    } finally {
      animations.forEach(animation => animation.cancel());
      delete document.body.dataset.switching;
      $('main').removeAttribute('aria-busy');
      navigating = false;
      const next = queuedView;
      queuedView = null;
      if (next && next !== activeView) showView(next);
      else ceremony.arrive(activeView);
    }
  }

  function celebrate(item, isNew) {
    const selectors = { flowers: '#flowers-object .flower-heads', candles: '#cake-object .candle-flames', wish: '#envelope-object .wax-seal' };
    const origin = document.querySelector(selectors[item]);
    const destination = document.querySelector('.letter-button-mark');
    ceremony.ritual(item, origin, destination, isNew && state.completed.size === 3, !isNew);
    if (!reducedMotion.matches) {
      const art = document.querySelector({ flowers: '.bouquet-art', candles: '.cake-art', wish: '.wax-seal svg' }[item]);
      art.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.18)', offset: .3 },
        { filter: 'brightness(1)' }], { duration: 900, easing: 'ease-out' });
    }
  }

  function updateProgress() {
    const count = state.completed.size;
    $('progress-text').replaceChildren(document.createTextNode(t('今天的美好') + ' '));
    const number = document.createElement('strong');
    number.textContent = `${count} / 3`;
    $('progress-text').append(number);
    const next = nextRitual();
    [...$('progress-petals').children].forEach((step, index) => {
      const done = state.completed.has(step.dataset.ritual);
      step.classList.toggle('is-complete', done);
      step.classList.toggle('is-next', step.dataset.ritual === next);
      step.setAttribute('aria-pressed', String(done));
      step.querySelector('.ritual-step-status').textContent = done ? '✓' : String(index + 1).padStart(2, '0');
    });
    for (const object of document.querySelectorAll('.room-object')) {
      const done = state.completed.has(object.dataset.item);
      object.classList.toggle('is-complete', done);
      object.classList.toggle('is-next', object.dataset.item === next);
      object.setAttribute('aria-pressed', String(done));
      object.querySelector('.object-plus').textContent = done ? '✓' : '+';
    }
    $('flowers-object').dataset.flower = state.flower;
    if (state.completed.has('flowers')) {
      $('flowers-object').querySelector('.object-name').textContent = flowers[state.flower];
      $('flowers-object').setAttribute('aria-label', t('已摆好{flower}，点击更换花束', { flower: flowers[state.flower] }));
    }
    if (state.completed.has('candles')) {
      $('cake-object').querySelector('.object-name').textContent = t('烛光已亮起');
      $('cake-object').setAttribute('aria-label', t('生日蜡烛已点亮，点击再许个愿'));
    }
    if (state.completed.has('wish')) {
      $('envelope-object').querySelector('.object-name').textContent = t('心意已珍藏');
      $('envelope-object').setAttribute('aria-label', t('生日祝福已珍藏，点击修改'));
    }
    $('open-letter').disabled = false;
    $('open-letter').dataset.ready = String(count === 3);
    document.querySelector('[data-view="letter"]').disabled = count !== 3;
    $('letter-button-label').textContent = count === 3 ? t('拆开她留给你的回信') : nextLabels[next];
    $('birthday-room').dataset.complete = String(count === 3);
  }

  function completeRitual(item, message) {
    const isNew = !state.completed.has(item);
    state.completed.add(item);
    updateProgress();
    if ($('ritual-dialog').open) $('ritual-dialog').close();
    $('room-speech').textContent = state.completed.size === 3
      ? t('等等，先别走呀。来陪我过生日的你，也有一份礼物哦♪')
      : message;
    celebrate(item, isNew);
    if (state.completed.size === 3 && isNew) toast(t('还有一封只写给你的信，拆开看看吧。'));
  }

  function selectFlower(value) {
    if (!Object.hasOwn(flowers, value)) return;
    draftFlower = value;
    $('flowers-object').dataset.flower = value;
    document.querySelectorAll('.flower-choice').forEach((choice) => {
      const selected = choice.dataset.flower === value;
      choice.classList.toggle('is-selected', selected);
      choice.setAttribute('aria-pressed', String(selected));
    });
  }

  function openRitual(item) {
    if (item === 'candles') {
      completeRitual('candles', t('你看，烛光亮起来了。希望你的愿望，也会在某一天悄悄实现。'));
      return;
    }
    const content = {
      flowers: ['01 · A FLOWER FOR YOU', t('把喜欢，放进一束花里。'), t('今天的花束，由你来挑选。每一种颜色都很好看呀♪')],
      wish: ['03 · WORDS FROM THE HEART', t('有些心意，值得被珍藏。'), t('不需要华丽的措辞。是你写的，我就会喜欢。')]
    }[item];
    if (!content) return;
    $('ritual-kicker').textContent = content[0];
    $('ritual-title').textContent = content[1];
    $('ritual-description').textContent = content[2];
    $('ritual-dialog').dataset.ritual = item;
    ['flowers', 'wish'].forEach((type) => { $(`${type}-panel`).hidden = type !== item; });
    if (item === 'flowers') selectFlower(state.flower);
    if (item === 'wish') {
      $('guest-name').value = state.name;
      $('birthday-wish').value = state.wish;
      $('wish-count').textContent = `${Array.from(state.wish).length} / 100`;
    }
    if (!$('ritual-dialog').open) $('ritual-dialog').showModal();
  }

  function cleanName(value) {
    return Array.from(value.replace(/[\u0000-\u001f\u007f]/g, '').trim()).slice(0, 16).join('');
  }

  function updateLetter() {
    $('letter-recipient').textContent = state.name || t('亲爱的你');
    $('saved-wish').hidden = !state.wish;
    $('saved-wish-text').textContent = state.wish ? t('你留下的心意：{wish}', { wish: state.wish }) : '';
  }

  function setMusicState(playing) {
    $('sound-toggle').setAttribute('aria-pressed', String(playing));
    $('sound-toggle').setAttribute('aria-label', t(playing ? '关闭八音盒音乐' : '开启八音盒音乐'));
    $('sound-toggle').title = t(playing ? '关闭八音盒音乐' : '开启八音盒音乐');
    $('sound-toggle').querySelector('.sound-label').textContent = t(playing ? '音乐开' : '音乐关');
  }

  function getArt() {
    if (!artPromise) {
      artPromise = new Promise((resolve, reject) => {
        const art = new Image();
        art.onload = () => resolve(art);
        art.onerror = () => reject(new Error(t('插画未能载入')));
        if (!window.BIRTHDAY_ART) { reject(new Error(t('未找到本地插画'))); return; }
        art.src = window.BIRTHDAY_ART;
      }).catch((error) => { artPromise = null; throw error; });
    }
    return artPromise;
  }

  function wrapText(ctx, value, x, y, width, lineHeight, maxLines) {
    const chars = Array.from(value);
    let line = '';
    let row = 0;
    for (const char of chars) {
      if (char === '\n' || ctx.measureText(line + char).width > width) {
        if (row === maxLines - 1) {
          while (ctx.measureText(line + '…').width > width && line) line = Array.from(line).slice(0, -1).join('');
          ctx.fillText(line + '…', x, y + row * lineHeight);
          return;
        }
        ctx.fillText(line, x, y + row * lineHeight);
        row++;
        line = char === '\n' ? '' : char;
      } else line += char;
    }
    if (line) ctx.fillText(line, x, y + row * lineHeight);
  }

  async function drawCard() {
    const art = await getArt();
    await document.fonts.ready;
    const ctx = $('keepsake-canvas').getContext('2d');
    ctx.clearRect(0, 0, 1200, 1680);
    const background = ctx.createLinearGradient(0, 0, 1200, 1680);
    background.addColorStop(0, '#fdf8ef'); background.addColorStop(1, '#f8ece8');
    ctx.fillStyle = background; ctx.fillRect(0, 0, 1200, 1680);
    ctx.strokeStyle = '#d5b1bc'; ctx.lineWidth = 1.5; ctx.strokeRect(32, 32, 1136, 1616);
    motifs.signet(ctx, 91, 82, 22, 0, .92, { color: '#a97ba1', light: false, lineWidth: 1.2 });
    ctx.fillStyle = '#aa7d8d'; ctx.font = '22px Georgia, serif'; ctx.fillText('E L Y S I A', 134, 91);
    ctx.textAlign = 'right'; ctx.font = '18px Georgia, serif'; ctx.fillText('NOVEMBER 11, 2026', 1122, 91);
    ctx.save(); ctx.beginPath(); ctx.roundRect(66, 130, 1068, 742, [290, 290, 12, 12]); ctx.clip();
    const cropHeight = art.width * 742 / 1068;
    const sourceY = (art.height - cropHeight) * .34;
    ctx.drawImage(art, 0, sourceY, art.width, cropHeight, 66, 130, 1068, 742);
    const shade = ctx.createLinearGradient(0, 680, 0, 872);
    shade.addColorStop(0, 'rgba(255,245,235,0)'); shade.addColorStop(1, 'rgba(130,66,95,.12)');
    ctx.fillStyle = shade; ctx.fillRect(66, 680, 1068, 192); ctx.restore();
    const serif = language === 'en' ? 'Georgia, "SimSun", serif' : '"SimSun", "Songti SC", serif';
    const sans = language === 'en' ? '"Segoe UI", "Microsoft YaHei", sans-serif' : '"Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#925b75'; ctx.font = `54px ${serif}`;
    ctx.fillText(t('把美好，都留在今天。'), 89, 970);
    ctx.fillStyle = '#b18c97'; ctx.font = '17px Georgia, serif';
    ctx.fillText('ONE DAY. ONE INVITATION. ONE BEAUTIFUL MEMORY.', 92, 1011);
    ctx.strokeStyle = '#dfc7cd'; ctx.beginPath(); ctx.moveTo(91, 1044); ctx.lineTo(1107, 1044); ctx.stroke();
    ctx.fillStyle = '#795967'; ctx.font = `32px ${sans}`; ctx.fillText(t('致{name}：', { name: state.name || t('亲爱的你') }), 92, 1101);
    ctx.fillStyle = '#98667e'; ctx.font = `36px ${serif}`;
    ctx.fillText(t('来陪我过生日的你，'), 92, 1166); ctx.fillText(t('也应该收到一份礼物呀♪'), 92, 1217);
    motifs.signet(ctx, 1040, 1164, 44, 0, .9,
      { color: {pink:'#bd8cac',white:'#bba78d',lavender:'#a18cbf'}[state.flower], light: false, lineWidth: 1.65 });
    ctx.fillStyle = '#b18c98'; ctx.font = `18px ${sans}`; ctx.fillText(t('你留给她的话'), 94, 1283);
    ctx.fillStyle = '#997c89'; ctx.font = `25px ${sans}`; wrapText(ctx, state.wish || defaultWish, 94, 1325, 1002, 39, 3);
    ctx.strokeStyle = '#e1cbd0'; ctx.beginPath(); ctx.moveTo(94, 1456); ctx.lineTo(1106, 1456); ctx.stroke();
    ctx.fillStyle = '#ae8495';
    ctx.textAlign = 'right'; ctx.font = `33px ${serif}`; ctx.fillText(t('爱莉希雅 ♡'), 1103, 1507);
    ctx.textAlign = 'center'; ctx.fillStyle = '#b397a1'; ctx.font = 'italic 22px Georgia, serif';
    ctx.fillText('May all the beautiful things find their way to you.', 600, 1572);
    ctx.font = `14px ${sans}`; ctx.fillText(t('11.11 生日纪念 · 同人邀约 / 插画 © miHoYo'), 600, 1615);
    ctx.textAlign = 'left';
  }

  function cardError() {
    $('card-status').textContent = t('纪念卡暂时没有生成，请关闭后重新打开。');
    $('download-card').disabled = true;
  }
  async function renderCard() {
    await drawCard();
    $('card-status').textContent = '';
    $('download-card').disabled = false;
  }

  $('accept-invitation').addEventListener('click', () => {
    state.invited = true;
    document.querySelector('[data-view="room"]').disabled = false;
    showView('room');
  });
  document.querySelector('.brand').addEventListener('click', (event) => { event.preventDefault(); showView('invitation'); });
  document.querySelectorAll('.chapter').forEach((chapter) => chapter.addEventListener('click', () => showView(chapter.dataset.view)));
  document.querySelectorAll('.room-object').forEach((object) => object.addEventListener('click', () => openRitual(object.dataset.item)));
  document.querySelectorAll('[data-ritual].ritual-step').forEach((step) => step.addEventListener('click', () => openRitual(step.dataset.ritual)));
  document.querySelectorAll('.flower-choice').forEach((choice) => choice.addEventListener('click', () => selectFlower(choice.dataset.flower)));
  $('close-ritual').addEventListener('click', () => $('ritual-dialog').close());
  $('ritual-dialog').addEventListener('close', () => { $('flowers-object').dataset.flower = state.flower; });
  $('place-flowers').addEventListener('click', () => {
    state.flower = draftFlower;
    completeRitual('flowers', t('{flower}……嗯，眼光很好嘛。我会把它放在最显眼的地方♪', { flower: flowers[state.flower] }));
  });
  $('birthday-wish').addEventListener('input', () => { $('wish-count').textContent = `${Array.from($('birthday-wish').value).length} / 100`; });
  $('wish-panel').addEventListener('submit', (event) => {
    event.preventDefault();
    state.name = cleanName($('guest-name').value);
    state.wish = Array.from($('birthday-wish').value.trim()).slice(0, 100).join('') || defaultWish;
    updateLetter();
    completeRitual('wish', t('这封信我会好好收着的。下次想起今天，就再拿出来读一遍。'));
  });
  $('open-letter').addEventListener('click', () => {
    const next = nextRitual();
    if (next) openRitual(next);
    else { updateLetter(); showView('letter'); }
  });
  $('back-to-room').addEventListener('click', () => showView('room'));
  $('make-card').addEventListener('click', () => {
    $('card-name').value = state.name;
    $('download-card').disabled = true;
    $('card-status').textContent = t('正在准备你的纪念卡……');
    $('card-dialog').showModal();
    renderCard().catch(cardError);
  });
  $('close-card').addEventListener('click', () => $('card-dialog').close());
  $('card-name').addEventListener('input', () => {
    state.name = cleanName($('card-name').value);
    updateLetter();
    $('download-card').disabled = true;
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => renderCard().catch(cardError), 120);
  });
  $('download-card').addEventListener('click', async () => {
    const button = $('download-card');
    button.disabled = true;
    try {
      clearTimeout(cardTimer);
      await drawCard();
      const blob = await new Promise((resolve, reject) => $('keepsake-canvas').toBlob((value) => {
        if (value) resolve(value); else reject(new Error('Empty canvas export'));
      }, 'image/png'));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = t('爱莉希雅-生日纪念-2026.11.11.png');
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      $('card-status').textContent = t('已开始下载，记得把这份美好收藏起来。');
    } catch (error) {
      $('card-status').textContent = t('保存未完成，请再试一次。');
    } finally { button.disabled = false; }
  });
  $('sound-toggle').addEventListener('click', async () => {
    if (!music.paused) { music.pause(); return; }
    try { await music.play(); } catch (error) { setMusicState(false); toast(t('音乐暂时没有响起来，再点一次试试吧。')); }
  });
  music.addEventListener('play', () => setMusicState(true));
  music.addEventListener('pause', () => setMusicState(false));
  music.addEventListener('error', () => { setMusicState(false); toast(t('音乐未能载入，检查素材文件是否完整后再试。')); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) music.pause(); });
  $('credits-trigger').addEventListener('click', () => $('credits-dialog').showModal());
  $('close-credits').addEventListener('click', () => $('credits-dialog').close());
  $('restart-experience').addEventListener('click', () => window.location.reload());
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  $('room-speech').setAttribute('aria-live', 'polite');
  updateProgress();
  ceremony.arrive('invitation');
})();
