function updateFileProgress(index, progress) {
  const fileItem = document.querySelector(`.file-item[data-index="${index}"]`);
  if (fileItem) {
    const progressFill = fileItem.querySelector('.progress-fill');
    const progressText = fileItem.querySelector('.progress-text');
    const statusText = fileItem.querySelector('.file-item-status');

    if (progressFill) {
      progressFill.style.width = progress + '%';
      progressFill.setAttribute('data-progress', progress);
    }
    if (progressText) progressText.textContent = progress + '%';
    if (statusText) statusText.textContent = require('./state').currentFiles[index].status;
  }
}

async function performConversion(file, outputFormat, quality, fileIndex, conversionType, resolution, ffmpegSettings) {
  const startTime = Date.now();
  console.log(`[CONVERSION] ▶ Iniciando: ${file.name} → ${outputFormat}`);
  console.log(`[CONVERSION] Tipo: ${conversionType} | Calidad: ${quality ?? 'default'} | Resolución: ${resolution} | Carpeta salida: ${require('./state').outputFolder ?? 'misma carpeta'}`);
  console.log(`[CONVERSION] Ruta: ${file.path}`);

  const progressListener = (event, data) => {
    if (data && data.index === fileIndex) {
      file.progress = data.progress;
      updateFileProgress(fileIndex, data.progress);
      if (data.progress % 20 === 0) {
        console.log(`[CONVERSION] Progreso ${file.name}: ${data.progress}%`);
      }
    }
  };

  window.api.onConversionProgress(progressListener);

  try {
    const result = await window.api.performConversion(file, outputFormat, quality, require('./state').outputFolder, fileIndex, conversionType, resolution, ffmpegSettings);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CONVERSION] ✓ Completado: ${file.name} en ${elapsed}s`);
    return result;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[CONVERSION] ✗ Error en ${file.name} (${elapsed}s): ${error.message}`);
    throw error;
  } finally {
    window.api.removeConversionProgressListener(progressListener);
  }
}

async function processConversionQueue(concurrentConversions) {
  const state = require('./state');
  console.log(`[QUEUE] Iniciando cola: ${state.conversionQueue.length} archivo(s), ${concurrentConversions} simultáneo(s)`);

  while (state.conversionQueue.length > 0 && state.isConverting) {
    const batch = state.conversionQueue.splice(0, concurrentConversions);
    console.log(`[QUEUE] Procesando lote de ${batch.length} archivo(s), restantes en cola: ${state.conversionQueue.length}`);

    const promises = batch.map(task => {
      const file = state.currentFiles[task.index];
      file.status = 'Convirtiendo...';
      updateFileProgress(task.index, 0);
      console.log(`[QUEUE] Iniciando: ${file.name} → ${task.outputFormat} (tipo: ${task.conversionType})`);

      return Promise.race([
        performConversion(task.file, task.outputFormat, task.quality, task.index, task.conversionType, task.resolution, state.ffmpegSettings),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: Conversión excedió tiempo límite (120s)')), 120000))
      ])
        .then(() => {
          file.status = 'Completado';
          file.progress = 100;
          updateFileProgress(task.index, 100);
          console.log(`[QUEUE] ✓ Completado: ${file.name}`);
        })
        .catch(err => {
          file.status = 'Error: ' + (err.message || 'Error desconocido');
          updateFileProgress(task.index, file.progress);
          console.error(`[QUEUE] ✗ Error en ${file.name}: ${err.message}`);
        });
    });

    state.activePromises = promises;
    await Promise.allSettled(promises);

    console.log(`[QUEUE] Lote completado. Archivos en cola: ${state.conversionQueue.length}`);

    if (state.conversionQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('[QUEUE] Cola de conversión finalizada');
}

function startConversion() {
  const state = require('./state');
  const { addLog } = require('./console');
  const { showToast } = require('./toast');

  if (state.currentFiles.length === 0) {
    showToast('No hay archivos para convertir', 'warning');
    return;
  }

  state.isConverting = true;
  addLog('Iniciando conversión de ' + state.currentFiles.length + ' archivo(s)');

  const outputFormat = document.getElementById('output-format')?.value;
  let quality = document.getElementById('quality')?.value;
  const resolution = document.getElementById('resolution')?.value || 'original';
  const openFolder = document.getElementById('chk-open-folder').checked;
  const concurrentConversions = parseInt(document.getElementById('concurrent-conversions').value);

  if (state.currentConversionType === 'image' || state.currentConversionType === 'compress') {
    quality = parseInt(quality) || 80;
  }

  state.conversionQueue = state.currentFiles.map((file, index) => {
    const fileExt = file.name.split('.').pop().toLowerCase();

    if (fileExt === outputFormat) {
      showToast(`Saltando ${file.name}: mismo formato (${fileExt})`, 'warning');
      return null;
    }

    return { file, index, outputFormat, quality, resolution, conversionType: state.currentConversionType };
  }).filter(task => task !== null);

  if (state.conversionQueue.length === 0) {
    showToast('No hay archivos para convertir (todos tienen el mismo formato)', 'warning');
    state.isConverting = false;
    return;
  }

  const btn = document.getElementById('btn-convert');
  const modalBtn = document.getElementById('modal-btn-convert');
  btn.disabled = true;
  modalBtn.disabled = true;
  btn.textContent = 'Convirtiendo...';
  modalBtn.textContent = 'Convirtiendo...';

  processConversionQueue(concurrentConversions).then(() => {
    state.isConverting = false;
    btn.disabled = false;
    modalBtn.disabled = false;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    modalBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Convertir`;
    addLog('Conversión completada');
    showToast('Conversión completada', 'success');

    if (openFolder && state.outputFolder) {
      window.api.openFolder(state.outputFolder);
    }
  });
}

module.exports = { updateFileProgress, performConversion, processConversionQueue, startConversion };
