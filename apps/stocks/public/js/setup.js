/**
 * Setup Page JavaScript
 * Handles auto-detection, manual input, and setup confirmation
 */

// Global state
let detectionData = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
});

function setupEventListeners() {
  // Auto-detect button
  const autoDetectBtn = document.getElementById('auto-detect-btn');
  if (autoDetectBtn) {
    autoDetectBtn.addEventListener('click', handleAutoDetect);
  }

  // Confirm button
  const confirmBtn = document.getElementById('confirm-btn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', handleConfirm);
  }

  // Manual submit button
  const manualSubmitBtn = document.getElementById('manual-submit-btn');
  if (manualSubmitBtn) {
    manualSubmitBtn.addEventListener('click', handleManualSubmit);
  }

  // Help toggle
  const helpToggle = document.getElementById('help-toggle');
  if (helpToggle) {
    helpToggle.addEventListener('click', toggleHelp);
  }
}

/**
 * Handle auto-detect button click
 */
async function handleAutoDetect() {
  showLoading();

  try {
    const response = await fetch('/api/setup');
    const data = await response.json();

    hideLoading();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to detect databases');
    }

    if (data.alreadySetup) {
      // Redirect to dashboard
      window.location.href = data.redirect;
      return;
    }

    if (data.needsManual) {
      // Show manual section with partial results
      showManualSection(data.detection);
    } else {
      // Show results for confirmation
      showResults(data.detection);
    }
  } catch (error) {
    hideLoading();
    showError('Auto-detection failed: ' + error.message);
  }
}

/**
 * Display detection results
 */
function showResults(detection) {
  detectionData = detection; // Store globally for confirmation

  const resultsList = document.getElementById('results-list');
  resultsList.innerHTML = `
    ${createResultCard('Stock Analyses Database', detection.stockAnalysesDb)}
    ${createResultCard('Stock History Database', detection.stockHistoryDb)}
    ${createResultCard('Sage Stocks Page', detection.sageStocksPage)}
  `;

  // Show results section
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('auto-section').classList.add('hidden');
}

/**
 * Create result card HTML
 */
function createResultCard(label, match) {
  if (!match) {
    return `
      <div class="border-2 border-red-200 bg-red-50 rounded-lg p-4 transition-all hover:shadow-md">
        <div class="flex items-center">
          <span class="text-red-600 mr-3 text-2xl">❌</span>
          <div class="flex-1">
            <div class="font-medium text-gray-900">${label}</div>
            <div class="text-sm text-red-600 mt-1">Not found - manual input needed</div>
          </div>
        </div>
      </div>
    `;
  }

  const confidenceColors = {
    high: { border: 'border-green-200', bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-800' },
    medium: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-800' },
    low: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-800' }
  };

  const colors = confidenceColors[match.confidence];

  return `
    <div class="border-2 ${colors.border} ${colors.bg} rounded-lg p-4 transition-all hover:shadow-md">
      <div class="flex items-start gap-3">
        <span class="${colors.text} text-2xl flex-shrink-0">✓</span>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-gray-900">${label}</div>
          <div class="text-sm text-gray-600 mt-1 truncate" title="${match.title}">${match.title}</div>
          ${match.confidence === 'medium' || match.confidence === 'low' ?
            `<div class="text-xs text-gray-500 mt-1">Please verify this is the correct database</div>` :
            ''
          }
        </div>
        <span class="text-xs px-3 py-1 ${colors.badge} rounded-full font-medium flex-shrink-0">
          ${match.confidence}
        </span>
      </div>
    </div>
  `;
}

/**
 * Handle confirmation
 */
async function handleConfirm() {
  if (!detectionData) return;

  const confirmBtn = document.getElementById('confirm-btn');
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Saving...';

  try {
    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockAnalysesDbId: detectionData.stockAnalysesDb.id,
        stockHistoryDbId: detectionData.stockHistoryDb.id,
        sageStocksPageId: detectionData.sageStocksPage.id
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Setup failed');
    }

    // Show success screen
    showSuccess(data.redirect);
  } catch (error) {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '✓ Confirm and continue';
    showError('Failed to save setup: ' + error.message);
  }
}

/**
 * Show manual section (with partial detection results pre-filled if available)
 */
function showManualSection(detection) {
  // Pre-fill any successful detections
  if (detection.stockAnalysesDb) {
    document.getElementById('manual-analyses').value = detection.stockAnalysesDb.id;
  }
  if (detection.stockHistoryDb) {
    document.getElementById('manual-history').value = detection.stockHistoryDb.id;
  }
  if (detection.sageStocksPage) {
    document.getElementById('manual-page').value = detection.sageStocksPage.id;
  }

  document.getElementById('manual-section').classList.remove('hidden');
  document.getElementById('auto-section').classList.add('hidden');
}

/**
 * Toggle help content
 */
function toggleHelp() {
  const helpContent = document.getElementById('help-content');
  const helpArrow = document.getElementById('help-arrow');

  if (helpContent.classList.contains('hidden')) {
    helpContent.classList.remove('hidden');
    helpArrow.style.transform = 'rotate(90deg)';
  } else {
    helpContent.classList.add('hidden');
    helpArrow.style.transform = 'rotate(0deg)';
  }
}

/**
 * Extract Notion ID from URL or ID string
 */
function extractNotionId(urlOrId) {
  if (!urlOrId) return '';

  // Remove whitespace
  urlOrId = urlOrId.trim();

  // If it's already a 32-char ID (with or without dashes), return it
  const idPattern = /^[a-f0-9]{32}$/i;
  const idWithDashesPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

  if (idPattern.test(urlOrId.replace(/-/g, ''))) {
    return urlOrId.replace(/-/g, '');
  }

  // Extract from URL
  // Format: https://www.notion.so/workspace/Page-Name-abc123def456...
  const urlMatch = urlOrId.match(/[a-f0-9]{32}/i);
  if (urlMatch) {
    return urlMatch[0];
  }

  // Extract from URL with dashes
  const urlWithDashesMatch = urlOrId.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  if (urlWithDashesMatch) {
    return urlWithDashesMatch[0].replace(/-/g, '');
  }

  return urlOrId; // Return as-is, let backend validate
}

/**
 * Handle manual submit
 */
async function handleManualSubmit() {
  const manualSubmitBtn = document.getElementById('manual-submit-btn');
  const errorsDiv = document.getElementById('manual-errors');

  // Extract IDs from inputs
  const stockAnalysesDbId = extractNotionId(document.getElementById('manual-analyses').value);
  const stockHistoryDbId = extractNotionId(document.getElementById('manual-history').value);
  const sageStocksPageId = extractNotionId(document.getElementById('manual-page').value);

  // Validate inputs
  if (!stockAnalysesDbId || !stockHistoryDbId || !sageStocksPageId) {
    showManualError('Please fill in all fields');
    return;
  }

  manualSubmitBtn.disabled = true;
  manualSubmitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⏳</span> Validating...';
  errorsDiv.classList.add('hidden');

  try {
    const response = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stockAnalysesDbId,
        stockHistoryDbId,
        sageStocksPageId
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Show validation errors
      if (data.errors && data.errors.length > 0) {
        showManualErrors(data.errors);
      } else {
        throw new Error(data.error || 'Validation failed');
      }
      manualSubmitBtn.disabled = false;
      manualSubmitBtn.innerHTML = 'Save configuration';
      return;
    }

    // Show success screen
    showSuccess(data.redirect);
  } catch (error) {
    manualSubmitBtn.disabled = false;
    manualSubmitBtn.innerHTML = 'Save configuration';
    showManualError('Failed to save setup: ' + error.message);
  }
}

/**
 * Show manual validation errors
 */
function showManualErrors(errors) {
  const errorsDiv = document.getElementById('manual-errors');

  errorsDiv.innerHTML = `
    <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded">
      <p class="font-medium text-red-800 mb-2">Validation errors:</p>
      <ul class="text-sm text-red-700 space-y-2">
        ${errors.map(error => `
          <li class="flex items-start gap-2">
            <span class="flex-shrink-0">•</span>
            <div>
              <strong>${error.field}:</strong> ${error.message}
              ${error.helpUrl ? `<br><a href="${error.helpUrl}" target="_blank" class="text-blue-600 hover:text-blue-700 underline text-xs">Learn more →</a>` : ''}
            </div>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  errorsDiv.classList.remove('hidden');
}

/**
 * Show single manual error
 */
function showManualError(message) {
  showManualErrors([{ field: 'Error', message }]);
}

/**
 * Show success screen with countdown
 */
function showSuccess(redirectUrl) {
  // Hide all other sections
  document.getElementById('auto-section').classList.add('hidden');
  document.getElementById('results-section').classList.add('hidden');
  document.getElementById('manual-section').classList.add('hidden');

  // Show success section
  document.getElementById('success-section').classList.remove('hidden');

  // Countdown and redirect
  let countdown = 3;
  const countdownEl = document.getElementById('countdown');

  const interval = setInterval(() => {
    countdown--;
    if (countdownEl) {
      countdownEl.textContent = countdown;
    }

    if (countdown <= 0) {
      clearInterval(interval);
      window.location.href = redirectUrl;
    }
  }, 1000);
}

/**
 * Show loading state
 */
function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
  document.getElementById('auto-section').classList.add('hidden');
}

/**
 * Hide loading state
 */
function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

/**
 * Show error message
 */
function showError(message) {
  // Create error alert at top of page
  const errorDiv = document.createElement('div');
  errorDiv.className = 'bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded slide-in';
  errorDiv.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-red-600 text-xl flex-shrink-0">⚠️</span>
      <div class="flex-1">
        <p class="font-medium text-red-800">Error</p>
        <p class="text-sm text-red-700 mt-1">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="text-red-600 hover:text-red-800 flex-shrink-0">
        ✕
      </button>
    </div>
  `;

  const container = document.querySelector('.bg-white');
  container.insertBefore(errorDiv, container.firstChild);

  // Show auto section again
  document.getElementById('auto-section').classList.remove('hidden');
}
