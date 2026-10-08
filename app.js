/**
 * Main Application Logic for Sirenes KMZ Mobile Locator
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let allFiles = [];
  let activeFileIds = [];
  let searchQuery = '';
  let selectedPlaceForModal = null;

  // Password Constant
  const AUTH_PASSWORD = 'telematica';
  let listenersInitialized = false;

  // DOM Elements - Auth
  const authScreen = document.getElementById('authScreen');
  const authForm = document.getElementById('authForm');
  const authPasswordInput = document.getElementById('authPasswordInput');
  const authToggleVisibilityBtn = document.getElementById('authToggleVisibilityBtn');
  const eyeIconOpen = document.getElementById('eyeIconOpen');
  const eyeIconClosed = document.getElementById('eyeIconClosed');
  const authErrorMsg = document.getElementById('authErrorMsg');
  const lockAppBtn = document.getElementById('lockAppBtn');
  const appContainer = document.getElementById('appContainer');

  // DOM Elements - Main App
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const uploadKmzBtn = document.getElementById('uploadKmzBtn');
  const kmzFileInput = document.getElementById('kmzFileInput');
  const filesListContainer = document.getElementById('filesListContainer');
  const activeFilesCount = document.getElementById('activeFilesCount');
  const placesSearchInput = document.getElementById('placesSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const placesCountBadge = document.getElementById('placesCountBadge');
  const placesListContainer = document.getElementById('placesListContainer');
  const emptyPlacesState = document.getElementById('emptyPlacesState');
  const toastNotification = document.getElementById('toastNotification');

  // Modal Elements
  const placeModal = document.getElementById('placeModal');
  const modalPlaceTitle = document.getElementById('modalPlaceTitle');
  const modalPlaceSub = document.getElementById('modalPlaceSub');
  const modalOpenMapsBtn = document.getElementById('modalOpenMapsBtn');
  const modalOpenWazeBtn = document.getElementById('modalOpenWazeBtn');
  const modalCopyCoordsBtn = document.getElementById('modalCopyCoordsBtn');
  const copyCoordsText = document.getElementById('copyCoordsText');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  // =========================================================
  // Initialize App
  // =========================================================
  function init() {
    initTheme();
    setupAuthListeners();
    checkAuth();
  }

  function checkAuth() {
    if (StorageManager.isAuthenticated()) {
      authScreen.style.display = 'none';
      appContainer.style.display = 'flex';
      loadFilesState();
      if (!listenersInitialized) {
        setupEventListeners();
        listenersInitialized = true;
      }
      renderAll();
    } else {
      authScreen.style.display = 'flex';
      appContainer.style.display = 'none';
      setTimeout(() => {
        authPasswordInput.focus();
      }, 100);
    }
  }

  function setupAuthListeners() {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = (authPasswordInput.value || '').trim().toLowerCase();
      if (entered === AUTH_PASSWORD) {
        authErrorMsg.style.display = 'none';
        authPasswordInput.classList.remove('error');
        StorageManager.setAuthenticated(true);
        checkAuth();
      } else {
        authPasswordInput.classList.add('error');
        authErrorMsg.style.display = 'block';
        authPasswordInput.value = '';
        authPasswordInput.focus();
      }
    });

    authToggleVisibilityBtn.addEventListener('click', () => {
      const isPassword = authPasswordInput.type === 'password';
      authPasswordInput.type = isPassword ? 'text' : 'password';
      eyeIconOpen.style.display = isPassword ? 'none' : 'block';
      eyeIconClosed.style.display = isPassword ? 'block' : 'none';
    });

    authPasswordInput.addEventListener('input', () => {
      if (authPasswordInput.classList.contains('error')) {
        authPasswordInput.classList.remove('error');
        authErrorMsg.style.display = 'none';
      }
    });

    lockAppBtn.addEventListener('click', () => {
      StorageManager.setAuthenticated(false);
      authPasswordInput.value = '';
      checkAuth();
    });
  }

  // =========================================================
  // Theme Management
  // =========================================================
  function initTheme() {
    const savedTheme = StorageManager.getTheme();
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const themeIcon = themeToggleBtn.querySelector('.theme-icon');
    const themeLabel = themeToggleBtn.querySelector('.theme-label');

    if (theme === 'light') {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'Escuro';
    } else {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'Claro';
    }
    StorageManager.saveTheme(theme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  // =========================================================
  // Data / Storage State
  // =========================================================
  function loadFilesState() {
    let stored = StorageManager.getFiles();
    if (!stored || stored.length === 0) {
      stored = typeof SAMPLE_FILES !== 'undefined' ? JSON.parse(JSON.stringify(SAMPLE_FILES)) : [];
      StorageManager.saveFiles(stored);
    } else if (typeof SAMPLE_FILES !== 'undefined') {
      // Synchronize sample files with any new places added in SAMPLE_FILES
      let changed = false;
      SAMPLE_FILES.forEach(sampleFile => {
        const existing = stored.find(f => f.id === sampleFile.id);
        if (existing) {
          sampleFile.places.forEach(samplePlace => {
            if (!existing.places.some(p => p.id === samplePlace.id || p.name === samplePlace.name)) {
              existing.places.push(samplePlace);
              existing.placesCount = existing.places.length;
              changed = true;
            }
          });
        } else {
          stored.push(JSON.parse(JSON.stringify(sampleFile)));
          changed = true;
        }
      });
      if (changed) {
        StorageManager.saveFiles(stored);
      }
    }
    allFiles = stored;

    let storedActive = StorageManager.getActiveFileIds();
    if (!storedActive || storedActive.length === 0) {
      if (allFiles.length > 0) {
        storedActive = [allFiles[0].id];
        StorageManager.saveActiveFileIds(storedActive);
      }
    }
    activeFileIds = storedActive;
  }

  // =========================================================
  // Rendering
  // =========================================================
  function renderAll() {
    renderFilesCarousel();
    renderPlacesList();
  }

  function renderFilesCarousel() {
    filesListContainer.innerHTML = '';

    const activeCount = activeFileIds.length;
    activeFilesCount.textContent = activeCount === 1 
      ? '1 arquivo ativo' 
      : `${activeCount} arquivos ativos`;

    allFiles.forEach(file => {
      const isActive = activeFileIds.includes(file.id);
      
      const card = document.createElement('div');
      card.className = `file-card ${isActive ? 'active' : ''}`;
      card.setAttribute('data-file-id', file.id);

      card.innerHTML = `
        <div class="file-status-indicator">
          <svg class="file-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div class="file-info">
          <span class="file-name">${escapeHtml(file.name)}</span>
          <span class="file-count">${file.places.length} locais</span>
        </div>
        ${allFiles.length > 1 ? `<button class="file-delete-btn" title="Remover arquivo" data-delete-id="${file.id}">✕</button>` : ''}
      `;

      card.addEventListener('click', (e) => {
        if (e.target.closest('.file-delete-btn')) {
          return;
        }
        toggleFileActive(file.id);
      });

      const delBtn = card.querySelector('.file-delete-btn');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteFileHandler(file.id, file.name);
        });
      }

      filesListContainer.appendChild(card);
    });
  }

  function toggleFileActive(fileId) {
    // Mode: Switch active file single-selection or toggle
    // If only one active is preferred like tabs:
    if (activeFileIds.includes(fileId) && activeFileIds.length > 1) {
      activeFileIds = activeFileIds.filter(id => id !== fileId);
    } else {
      activeFileIds = [fileId];
    }
    StorageManager.saveActiveFileIds(activeFileIds);
    renderFilesCarousel();
    renderPlacesList();
  }

  function deleteFileHandler(fileId, fileName) {
    if (confirm(`Deseja remover o arquivo "${fileName}"?`)) {
      allFiles = StorageManager.deleteFile(fileId);
      activeFileIds = StorageManager.getActiveFileIds();
      if (activeFileIds.length === 0 && allFiles.length > 0) {
        activeFileIds = [allFiles[0].id];
        StorageManager.saveActiveFileIds(activeFileIds);
      }
      renderAll();
      showToast(`Arquivo "${fileName}" removido.`);
    }
  }

  function getFilteredPlaces() {
    const activeFiles = allFiles.filter(f => activeFileIds.includes(f.id));
    let places = [];
    activeFiles.forEach(f => {
      places = places.concat(f.places);
    });

    if (searchQuery.trim() !== '') {
      places = places.filter(p => placeMatchesQuery(p, searchQuery));
    }

    return places;
  }

  function renderPlacesList() {
    placesListContainer.innerHTML = '';
    const filteredPlaces = getFilteredPlaces();

    placesCountBadge.textContent = `${filteredPlaces.length} locais`;

    if (filteredPlaces.length === 0) {
      emptyPlacesState.style.display = 'flex';
      return;
    }

    emptyPlacesState.style.display = 'none';

    // Limit initial render batch to 100 for high performance, with seamless scrolling
    const itemsToRender = filteredPlaces.slice(0, 150);

    const fragment = document.createDocumentFragment();

    itemsToRender.forEach(place => {
      const card = document.createElement('div');
      card.className = 'place-card';
      card.setAttribute('data-lat', place.lat);
      card.setAttribute('data-lng', place.lng);
      card.setAttribute('data-name', place.name);

      card.innerHTML = `
        <div class="place-left">
          <div class="place-badge">
            <div class="place-dot"></div>
          </div>
          <div class="place-details">
            <div class="place-title">${escapeHtml(place.name)}</div>
            <div class="place-sub">${escapeHtml(place.file)} · ${place.formattedCoords}</div>
          </div>
        </div>
        <div class="place-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </div>
      `;

      // Main click action: Directly open Google Maps
      card.addEventListener('click', (e) => {
        openInGoogleMaps(place.lat, place.lng, place.name);
      });

      // Optional Context/Long press for extra actions
      let pressTimer;
      card.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => {
          openPlaceModal(place);
        }, 600);
      }, { passive: true });
      card.addEventListener('touchend', () => clearTimeout(pressTimer));
      card.addEventListener('touchmove', () => clearTimeout(pressTimer));

      fragment.appendChild(card);
    });

    placesListContainer.appendChild(fragment);
  }

  // =========================================================
  // Google Maps Redirection
  // =========================================================
  function openInGoogleMaps(lat, lng, name) {
    // Standard Universal Google Maps search URL which works on Android, iOS & Desktop browsers
    const encodedName = encodeURIComponent(name || 'Local');
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    
    // Open in new tab / triggers native Google Maps app on mobile
    window.open(url, '_blank');
  }

  function openInWaze(lat, lng) {
    const url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    window.open(url, '_blank');
  }

  // =========================================================
  // Modal / Bottom Sheet
  // =========================================================
  function openPlaceModal(place) {
    selectedPlaceForModal = place;
    modalPlaceTitle.textContent = place.name;
    modalPlaceSub.textContent = `${place.file} · ${place.formattedCoords}`;
    copyCoordsText.textContent = 'Copiar Coordenadas';
    placeModal.style.display = 'flex';
  }

  function closePlaceModal() {
    placeModal.style.display = 'none';
    selectedPlaceForModal = null;
  }

  // =========================================================
  // File Upload Handling
  // =========================================================
  async function handleFileUpload(files) {
    if (!files || files.length === 0) return;

    let addedCount = 0;
    let newFileIds = [];

    showToast('Processando arquivo(s)...');

    for (const file of files) {
      try {
        const parsedData = await KmzParser.parseFile(file);
        if (parsedData.places.length === 0) {
          showToast(`Nenhum local com coordenadas encontrado em "${file.name}"`);
          continue;
        }

        allFiles = StorageManager.addFile(parsedData);
        newFileIds.push(parsedData.id);
        addedCount++;
      } catch (err) {
        console.error('Erro ao ler arquivo:', err);
        showToast(`Erro ao processar ${file.name}: ${err.message}`);
      }
    }

    if (addedCount > 0) {
      // Set newly added file as active
      activeFileIds = [newFileIds[newFileIds.length - 1]];
      StorageManager.saveActiveFileIds(activeFileIds);
      renderAll();
      showToast(`${addedCount} arquivo(s) KMZ adicionado(s) com sucesso!`);
    }

    // Reset input
    kmzFileInput.value = '';
  }

  // =========================================================
  // Event Listeners
  // =========================================================
  function setupEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Upload KMZ button
    uploadKmzBtn.addEventListener('click', () => {
      kmzFileInput.click();
    });

    kmzFileInput.addEventListener('change', (e) => {
      handleFileUpload(e.target.files);
    });

    // Drag & Drop support on upload button
    uploadKmzBtn.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadKmzBtn.style.opacity = '0.8';
    });

    uploadKmzBtn.addEventListener('dragleave', () => {
      uploadKmzBtn.style.opacity = '1';
    });

    uploadKmzBtn.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadKmzBtn.style.opacity = '1';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    });

    // Search input
    placesSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchQuery.trim() !== '') {
        clearSearchBtn.style.display = 'flex';
      } else {
        clearSearchBtn.style.display = 'none';
      }
      renderPlacesList();
    });

    clearSearchBtn.addEventListener('click', () => {
      placesSearchInput.value = '';
      searchQuery = '';
      clearSearchBtn.style.display = 'none';
      placesSearchInput.focus();
      renderPlacesList();
    });

    // Modal Actions
    modalCloseBtn.addEventListener('click', closePlaceModal);
    placeModal.addEventListener('click', (e) => {
      if (e.target === placeModal) {
        closePlaceModal();
      }
    });

    modalOpenMapsBtn.addEventListener('click', () => {
      if (selectedPlaceForModal) {
        openInGoogleMaps(selectedPlaceForModal.lat, selectedPlaceForModal.lng, selectedPlaceForModal.name);
        closePlaceModal();
      }
    });

    modalOpenWazeBtn.addEventListener('click', () => {
      if (selectedPlaceForModal) {
        openInWaze(selectedPlaceForModal.lat, selectedPlaceForModal.lng);
        closePlaceModal();
      }
    });

    modalCopyCoordsBtn.addEventListener('click', () => {
      if (selectedPlaceForModal) {
        const coords = `${selectedPlaceForModal.lat}, ${selectedPlaceForModal.lng}`;
        navigator.clipboard.writeText(coords).then(() => {
          copyCoordsText.textContent = 'Copiado!';
          setTimeout(() => {
            closePlaceModal();
            showToast('Coordenadas copiadas para a área de transferência!');
          }, 400);
        }).catch(() => {
          showToast(`Coordenadas: ${coords}`);
        });
      }
    });
  }

  // =========================================================
  // Utilities
  // =========================================================
  function normalizeString(str) {
    return (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function cleanAlphanumeric(str) {
    return normalizeString(str).replace(/[^a-z0-9]/g, '');
  }

  function placeMatchesQuery(place, query) {
    if (!query) return true;
    const qNorm = normalizeString(query.trim());
    const qClean = cleanAlphanumeric(query);

    const pName = normalizeString(place.name);
    const pNameClean = cleanAlphanumeric(place.name);
    const pCoords = normalizeString(place.formattedCoords || '');
    const pDesc = normalizeString(place.desc || '');
    const pFile = normalizeString(place.file || '');

    // 1. Direct contains in normalized
    if (pName.includes(qNorm) || pCoords.includes(qNorm) || pDesc.includes(qNorm) || pFile.includes(qNorm)) {
      return true;
    }

    // 2. Alphanumeric clean match (ignores dashes, spaces, punctuation)
    if (qClean.length >= 2) {
      if (pNameClean.includes(qClean) || cleanAlphanumeric(pDesc).includes(qClean)) {
        return true;
      }
    }

    // 3. Multi-token match (all words in query must be present)
    const tokens = qNorm.split(/[\s\-_,;/]+/).filter(t => t.length > 0);
    if (tokens.length > 1) {
      const fullText = pName + ' ' + pCoords + ' ' + pDesc + ' ' + pFile;
      const fullTextClean = pNameClean + ' ' + cleanAlphanumeric(pCoords) + ' ' + cleanAlphanumeric(pDesc);
      const allMatch = tokens.every(token => {
        const tClean = cleanAlphanumeric(token);
        return fullText.includes(token) || (tClean.length >= 2 && fullTextClean.includes(tClean));
      });
      if (allMatch) return true;
    }

    return false;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  let toastTimeout;
  function showToast(message) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastNotification.textContent = message;
    toastNotification.style.display = 'block';

    toastTimeout = setTimeout(() => {
      toastNotification.style.display = 'none';
    }, 2800);
  }

  // Kickoff
  init();
});
