function addLog(message, type = 'info') {
  const consoleContent = document.getElementById('console-content');
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry log-${type}`;
  logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
  consoleContent.appendChild(logEntry);
  consoleContent.scrollTop = consoleContent.scrollHeight;
}

function initConsolePanel(state) {
  document.getElementById('btn-console').addEventListener('click', () => {
    const consolePanel = document.getElementById('console-panel');
    state.consolePanelVisible = !state.consolePanelVisible;
    consolePanel.classList.toggle('active', state.consolePanelVisible);
    addLog('Panel de consola ' + (state.consolePanelVisible ? 'abierto' : 'cerrado'), 'info');
  });

  document.getElementById('btn-close-console').addEventListener('click', () => {
    const consolePanel = document.getElementById('console-panel');
    state.consolePanelVisible = false;
    consolePanel.classList.remove('active');
    addLog('Panel de consola cerrado', 'info');
  });

  document.getElementById('btn-clear-logs').addEventListener('click', () => {
    const consoleContent = document.getElementById('console-content');
    consoleContent.innerHTML = '';
    addLog('Logs limpiados', 'info');
  });

  document.getElementById('btn-copy-logs').addEventListener('click', () => {
    const consoleContent = document.getElementById('console-content');
    const logText = consoleContent.innerText;
    if (logText.trim()) {
      navigator.clipboard.writeText(logText).then(() => {
        showToast('Logs copiados al portapapeles', 'success');
      }).catch(err => {
        showToast('Error al copiar logs: ' + err.message, 'error');
      });
    } else {
      showToast('No hay logs para copiar', 'warning');
    }
  });

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = function(...args) {
    originalLog.apply(console, args);
    addLog(args.join(' '), 'info');
  };

  console.error = function(...args) {
    originalError.apply(console, args);
    addLog(args.join(' '), 'error');
  };

  console.warn = function(...args) {
    originalWarn.apply(console, args);
    addLog(args.join(' '), 'warning');
  };
}

module.exports = { addLog, initConsolePanel };
