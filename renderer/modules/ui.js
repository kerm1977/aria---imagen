function initUIControls() {
  document.getElementById('winMinimize').addEventListener('click', () => window.api.windowMinimize());
  document.getElementById('winMaximize').addEventListener('click', () => window.api.windowMaximize());
  document.getElementById('winClose').addEventListener('click', () => window.api.windowClose());

  document.getElementById('titleBarTheme').addEventListener('click', () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    html.setAttribute('data-theme', currentTheme === 'light' ? 'dark' : 'light');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('active');
  });

  document.getElementById('close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('active');
  });

  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target.id === 'settings-modal') {
      document.getElementById('settings-modal').classList.remove('active');
    }
  });

  document.getElementById('ffmpeg-preset').addEventListener('change', (e) => {
    const state = require('./state');
    state.ffmpegSettings.preset = e.target.value;
  });

  document.getElementById('ffmpeg-threads').addEventListener('change', (e) => {
    const state = require('./state');
    state.ffmpegSettings.threads = e.target.value;
  });

  document.getElementById('chk-hardware-accel').addEventListener('change', (e) => {
    const state = require('./state');
    state.ffmpegSettings.hardwareAccel = e.target.checked;
  });

  document.getElementById('chk-fast-decode').addEventListener('change', (e) => {
    const state = require('./state');
    state.ffmpegSettings.fastDecode = e.target.checked;
  });
}

function initConfirmModal() {
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const confirmYes = document.getElementById('confirm-yes');
  const confirmNo = document.getElementById('confirm-no');
  const closeConfirm = document.getElementById('close-confirm');
  let confirmCallback = null;

  function showConfirmModal(message, callback) {
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmModal.classList.add('active');
  }

  function hideConfirmModal() {
    confirmModal.classList.remove('active');
    confirmCallback = null;
  }

  confirmYes.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    hideConfirmModal();
  });

  confirmNo.addEventListener('click', hideConfirmModal);
  closeConfirm.addEventListener('click', hideConfirmModal);

  confirmModal.addEventListener('click', (e) => {
    if (e.target.id === 'confirm-modal') hideConfirmModal();
  });

  return { showConfirmModal };
}

function initInfoModal() {
  const infoModal = document.getElementById('info-modal');
  const fileInfoContent = document.getElementById('file-info-content');
  const closeInfo = document.getElementById('close-info');

  async function showFileInfo(file) {
    const result = await window.api.getFileInfo(file.path);
    if (result.success) {
      const info = result.info;
      let infoHTML = `
        <div class="info-row"><span class="info-label">Nombre:</span><span class="info-value">${info.name}</span></div>
        <div class="info-row"><span class="info-label">Ubicación:</span><span class="info-value">${info.directory}</span></div>
        <div class="info-row"><span class="info-label">Tamaño:</span><span class="info-value">${info.size}</span></div>
        <div class="info-row"><span class="info-label">Extensión:</span><span class="info-value">${info.extension}</span></div>
      `;
      fileInfoContent.innerHTML = infoHTML;
      infoModal.classList.add('active');
    } else {
      showToast('Error al obtener información del archivo', 'error');
    }
  }

  closeInfo.addEventListener('click', () => infoModal.classList.remove('active'));
  infoModal.addEventListener('click', (e) => { if (e.target.id === 'info-modal') infoModal.classList.remove('active'); });

  return { showFileInfo };
}

function initAboutModal() {
  const aboutModal = document.getElementById('about-modal');
  const closeAbout = document.getElementById('close-about');
  const btnInfo = document.getElementById('btn-info');

  btnInfo.addEventListener('click', () => aboutModal.classList.add('active'));
  closeAbout.addEventListener('click', () => aboutModal.classList.remove('active'));
  aboutModal.addEventListener('click', (e) => { if (e.target.id === 'about-modal') aboutModal.classList.remove('active'); });
}

module.exports = { initUIControls, initConfirmModal, initInfoModal, initAboutModal };
