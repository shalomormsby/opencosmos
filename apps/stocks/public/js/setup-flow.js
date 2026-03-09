/**
 * Setup Flow JavaScript - Single-Page Subway Map Setup
 * Handles all 6 steps of the onboarding flow with persistent progress indication
 */

// ============================================================================
// Constants & Configuration
// ============================================================================

const STEPS = [
  {
    number: 1,
    title: 'Duplicate Template',
    icon: '📄',
    duration: '1 min',
    description: 'Get the template',
  },
  {
    number: 2,
    title: 'Connect Notion',
    icon: '🔗',
    duration: '1 min',
    description: 'Sign in with Notion',
  },
  {
    number: 3,
    title: 'Run First Analysis',
    icon: '📊',
    duration: '1 min',
    description: 'Analyze a stock',
  },
];

const TEMPLATE_URL = 'https://www.notion.so/Sage-Stocks-2a9a1d1b67e0818b8e9fe451466994fc';

// ============================================================================
// Global State
// ============================================================================

let currentState = {
  setupComplete: false,
  currentStep: 1,
  completedSteps: [],
  setupProgress: null,
  user: null,
  pollingInterval: null,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Handle setup flow initiation with database check
 * Routes users based on their status:
 * - Existing users with template -> Skip OAuth, go to app
 * - New users -> OAuth with automatic template duplication
 * - Existing users without template -> OAuth to reconnect
 */
async function handleSetupStart(emailInput = null) {
  // Check if user has an existing session
  const hasSessionCookie = document.cookie.includes('si_session=');
  const savedEmail = localStorage.getItem('sage_stocks_user_email');

  let userEmail = emailInput || savedEmail;

  if (!userEmail && !hasSessionCookie) {
    console.log('✨ No email provided - UI should show email input');
    return;
  }

  // Normalize and save email
  if (userEmail) {
    userEmail = userEmail.toLowerCase().trim();
    localStorage.setItem('sage_stocks_user_email', userEmail);
  }

  // Check database: Route based on user status
  try {
    console.log('🔍 Checking database for existing user...', {
      userEmail,
      hasSessionCookie,
      savedEmail,
    });

    if (userEmail) {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();

      console.log('📋 Check-email response:', {
        success: data.success,
        exists: data.exists,
        hasTemplate: data.hasTemplate,
        requiresOAuth: data.requiresOAuth,
        redirectTo: data.redirectTo,
        fullResponse: data,
      });

      if (!data.requiresOAuth && data.redirectTo) {
        // Existing user with template -> Skip OAuth, go directly to app
        console.log(`✅ Existing user with template - redirecting to: ${data.redirectTo}`);
        window.location.href = data.redirectTo;
      } else if (data.requiresOAuth) {
        // New user OR reconnection needed: Go through OAuth with automatic template duplication
        console.log('🔐 OAuth required - redirecting to authorization (template will auto-duplicate)', {
          exists: data.exists,
          hasTemplate: data.hasTemplate,
        });
        proceedToOAuth(userEmail);
      } else {
        console.warn('⚠️ Unexpected response from check-email:', data);
      }
    } else if (hasSessionCookie) {
      // Has session: Skip to app
      console.log('✅ Session detected - going to app');
      window.location.href = '/pages/analyze.html';
    }
  } catch (error) {
    console.error('❌ Database check failed:', error);
    // On error, go to OAuth and let backend handle it
    proceedToOAuth(userEmail);
  }
}

/**
 * Proceed to OAuth (for new users - automatic template duplication)
 */
function proceedToOAuth(email = null) {
  let authUrl = '/api/auth/authorize';

  if (email) {
    authUrl += `?email=${encodeURIComponent(email)}`;
  }

  console.log('🚀 Proceeding to OAuth with automatic template duplication:', authUrl);
  window.location.href = authUrl;
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Setup flow initialized');

  // Check for URL params (OAuth callback, errors, etc.)
  const params = new URLSearchParams(window.location.search);
  const stepParam = params.get('step');
  const errorParam = params.get('error');
  const statusParam = params.get('status');

  // Handle errors
  if (errorParam) {
    showError(getErrorMessage(errorParam));
  }

  // Load setup status from API first (to check if they've been approved since last visit)
  await loadSetupStatus();

  // If they have a session but status param says pending/denied, check actual status from API
  if (statusParam === 'pending' || statusParam === 'denied') {
    console.log('🔍 Checking approval status from API...');
    console.log('   URL param:', statusParam);
    console.log('   API user status:', currentState.user?.status);
    console.log('   User object:', currentState.user);

    // User object from API will have current approval status
    if (currentState.user && currentState.user.status === 'approved') {
      // They were approved! Redirect to step 2 (duplicate template)
      console.log('✅ User approved! Redirecting to step 2...');
      window.location.href = '/?step=2';
      return;
    } else {
      // Still pending/denied - show status message but ALSO show subway map
      console.log('⏳ User still pending/denied, showing status message');
      renderSubwayMap();
      showStatusMessage(statusParam);
      return;
    }
  }

  // If OAuth callback just completed (step=2 means OAuth succeeded, now verify)
  // Note: step=2 in URL means OAuth completed, but we're now on Step 3 (verify + analyze)
  if (stepParam === '2') {
    currentState.currentStep = 3;
    currentState.completedSteps = [1, 2]; // Template duplication (step 1) and OAuth (step 2) are complete
    await advanceToStep(3, { step2Complete: true });
  }

  // Render subway map and content
  renderSubwayMap();
  renderStepContent();

  // Auto-trigger database detection if we just completed Step 2 (duplicate)
  if (currentState.currentStep === 3) {
    setTimeout(() => {
      triggerAutoDetection();
    }, 500);
  }
});

// ============================================================================
// Database Auto-Detection (Critical for setup completion)
// ============================================================================

/**
 * Trigger automatic database detection
 * Called automatically after workspace verification (Step 2 → Step 3 transition)
 *
 * This function is CRITICAL - without it, database IDs remain empty and
 * analysis attempts will fail with "database not configured" errors.
 */
async function triggerAutoDetection() {
  console.log('🔍 Starting automatic database detection...');

  try {
    const response = await fetch('/api/setup/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    console.log('📡 Detection API response:', response.status, data);

    if (!response.ok) {
      throw new Error(data.error || 'Detection failed');
    }

    if (data.success && data.detection) {
      const { stockAnalysesDb, stockHistoryDb, stockEventsDb, marketContextDb, sageStocksPage, needsManual } = data.detection;

      // If setup is already complete, don't treat missing optional DBs as an error
      if (data.alreadySetup) {
        clearErrors();
        console.log('✅ Auto-detection: user already set up. Using stored database IDs.', {
          hasStockAnalyses: !!stockAnalysesDb,
          hasStockHistory: !!stockHistoryDb,
          hasStockEvents: !!stockEventsDb,
          hasMarketContext: !!marketContextDb,
          hasSageStocksPage: !!sageStocksPage,
        });
        // Nothing else to do here – backend has already saved IDs
        return;
      }

      // Check if all required databases were found
      // For new users, the core requirement is: analyses DB, history DB, and Sage Stocks page.
      // Stock Events and Market Context databases are required for best experience but
      // shouldn't block setup UI if core pieces are present.
      const hasCoreDbs = !!stockAnalysesDb && !!stockHistoryDb && !!sageStocksPage;

      if (!needsManual && hasCoreDbs) {
        clearErrors();
        console.log('✅ Auto-detection successful!');
        console.log('   Stock Analyses DB:', stockAnalysesDb.id);
        console.log('   Stock History DB:', stockHistoryDb.id);
        console.log('   Stock Events DB:', stockEventsDb ? stockEventsDb.id : '(optional: not detected)');
        console.log('   Market Context DB:', marketContextDb ? marketContextDb.id : '(optional: not detected)');
        console.log('   Sage Stocks Page:', sageStocksPage.id);

        // Database IDs are already saved by the backend (api/setup/detect.ts lines 71-102)
        // User can now proceed to Step 3 (first analysis)
      } else if (needsManual) {
        console.warn('⚠️  Partial detection - some databases not found');
        console.log('   Found:', {
          stockAnalysesDb: !!stockAnalysesDb,
          stockHistoryDb: !!stockHistoryDb,
          stockEventsDb: !!stockEventsDb,
          marketContextDb: !!marketContextDb,
          sageStocksPage: !!sageStocksPage,
        });

        // Show error to user - manual entry would be needed
        showError('Could not find all databases in your workspace. Please verify you duplicated the Sage Stocks template correctly.');
      } else {
        console.error('❌ Detection succeeded but returned unexpected data structure');
        showError('Database detection completed with unexpected results. Please contact support.');
      }
    } else {
      console.error('❌ Detection API returned unexpected response:', data);
      showError('Database detection failed. Please contact support.');
    }
  } catch (error) {
    console.error('❌ Auto-detection failed:', error);
    showError(`Database detection failed: ${error.message}. Please refresh and try again, or contact support.`);
  }
}

// ============================================================================
// API Communication
// ============================================================================

async function loadSetupStatus() {
  try {
    console.log('📡 Loading setup status from API...');
    const response = await fetch('/api/setup/status');
    const data = await response.json();

    console.log('📡 API response:', response.status, data);

    if (!response.ok) {
      if (data.requiresAuth) {
        // No session - show Step 1 & 2 (pre-OAuth)
        console.log('🔒 No session, starting from Step 1');
        currentState.currentStep = 1;
        currentState.completedSteps = [];
        return;
      }
      throw new Error(data.error || 'Failed to load setup status');
    }

    currentState.setupComplete = data.setupComplete;
    currentState.setupProgress = data.setupProgress;
    currentState.user = data.user;
    currentState.currentStep = data.setupProgress?.currentStep || 1;
    currentState.completedSteps = data.setupProgress?.completedSteps || [];

    console.log('✅ Setup status loaded:', {
      setupComplete: currentState.setupComplete,
      currentStep: currentState.currentStep,
      userStatus: currentState.user?.status,
    });

    // If setup is complete, redirect to analyzer
    if (data.setupComplete && currentState.currentStep === 6) {
      console.log('✓ Setup complete, redirecting to analyzer...');
      setTimeout(() => {
        window.location.href = '/pages/analyze.html';
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Failed to load setup status:', error);
    // Assume fresh user if API fails
    currentState.currentStep = 1;
    currentState.completedSteps = [];
  }
}

async function advanceToStep(step, data = null) {
  try {
    const response = await fetch('/api/setup/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, data }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to advance step');
    }

    currentState.setupProgress = result.setupProgress;
    currentState.currentStep = result.setupProgress.currentStep;
    currentState.completedSteps = result.setupProgress.completedSteps;

    renderSubwayMap();
    renderStepContent();

    console.log(`✓ Advanced to step ${step}`);

    // Auto-trigger database detection when advancing to step 3
    if (step === 3) {
      setTimeout(() => {
        triggerAutoDetection();
      }, 500);
    }
  } catch (error) {
    console.error(`❌ Failed to advance to step ${step}:`, error);
    showError(`Failed to update progress: ${error.message}`);
  }
}

// ============================================================================
// Subway Map Rendering
// ============================================================================

function renderSubwayMap() {
  const desktopContainer = document.querySelector('#subway-map .hidden.md\\:flex');
  const mobileContainer = document.querySelector('#subway-map .md\\:hidden');

  if (!desktopContainer || !mobileContainer) return;

  // Clear existing content
  desktopContainer.innerHTML = '';
  mobileContainer.innerHTML = '';

  // Render each step
  STEPS.forEach((step, index) => {
    const state = getStepState(step.number);
    const isLast = index === STEPS.length - 1;

    // Desktop (horizontal)
    desktopContainer.appendChild(createStepIndicator(step, state, false, isLast));

    // Mobile (vertical)
    mobileContainer.appendChild(createStepIndicator(step, state, true, isLast));
  });

  // Update progress badge
  updateProgressBadge();
}

function createStepIndicator(step, state, isVertical, isLast) {
  const container = document.createElement('div');
  container.className = isVertical ? 'relative' : 'flex-1 text-center relative';

  const indicator = document.createElement('div');
  indicator.className = `step-indicator ${state} ${state === 'in-progress' ? 'pulse-slow' : ''}`;

  if (state === 'complete') {
    indicator.innerHTML = '✓';
  } else if (state === 'in-progress') {
    // Pulse indicator instead of spinner
    indicator.textContent = step.number;
  } else {
    indicator.textContent = step.number;
  }

  const title = document.createElement('div');
  title.className = 'step-title';
  title.textContent = step.title;

  const description = document.createElement('div');
  description.className = 'step-description';
  description.textContent = `${step.icon} ${step.description}`;

  const duration = document.createElement('div');
  duration.className = 'step-duration';
  duration.textContent = step.duration ? `⏱️ ${step.duration}` : '';

  if (isVertical) {
    const content = document.createElement('div');
    content.className = 'flex items-start gap-4';

    const indicatorWrapper = document.createElement('div');
    indicatorWrapper.className = 'relative flex-shrink-0';
    indicatorWrapper.appendChild(indicator);

    // Add connector line for vertical layout (except last step)
    if (!isLast) {
      const connector = document.createElement('div');
      connector.className = `subway-connector ${state === 'complete' ? 'complete' : ''}`;
      indicatorWrapper.appendChild(connector);
    }

    const textContent = document.createElement('div');
    textContent.className = 'flex-1 pt-2';
    textContent.appendChild(title);
    textContent.appendChild(description);
    if (step.duration) textContent.appendChild(duration);

    content.appendChild(indicatorWrapper);
    content.appendChild(textContent);
    container.appendChild(content);
  } else {
    container.appendChild(indicator);
    container.appendChild(title);
    container.appendChild(description);
    if (step.duration) container.appendChild(duration);
  }

  return container;
}

function getStepState(stepNumber) {
  if (currentState.completedSteps.includes(stepNumber)) {
    return 'complete';
  }
  if (currentState.currentStep === stepNumber) {
    return 'in-progress';
  }
  return 'pending';
}

function updateProgressBadge() {
  const badge = document.getElementById('progress-badge');
  const badgeStep = document.getElementById('badge-step');

  if (!badge || !badgeStep) return;

  if (currentState.currentStep <= 3) {
    badge.classList.remove('hidden');
    badgeStep.textContent = currentState.currentStep;
  } else {
    badge.classList.add('hidden');
  }
}

// ============================================================================
// Step Content Rendering
// ============================================================================

function renderStepContent() {
  const container = document.getElementById('setup-content');
  if (!container) return;

  container.innerHTML = '';

  // Render content based on current step
  switch (currentState.currentStep) {
    case 1:
      // Step 1: Duplicate Template (BEFORE OAuth)
      container.appendChild(createStep1Content());
      break;
    case 2:
      // Step 2: Connect Notion (OAuth - user selects duplicated pages)
      container.appendChild(createStep2Content());
      break;
    case 3:
      // Step 3: Verify workspace and run first analysis
      container.appendChild(createStep3Content());
      break;
    case 4:
    case 5:
    case 6:
      // Legacy steps from old 6-step flow - should not be reached
      console.warn(`Legacy step ${currentState.currentStep} reached, showing step 3...`);
      container.appendChild(createStep3Content());
      break;
  }
}

// ============================================================================
// Step 1: Duplicate Template (BEFORE OAuth)
// ============================================================================

function createStep1Content() {
  const section = document.createElement('div');
  section.className = 'slide-in';

  section.innerHTML = `
    <div class="mb-6 p-6 glass-strong rounded-2xl">
      <div class="flex items-start gap-4">
        <div class="text-4xl">📄</div>
        <div class="flex-1">
          <h3 class="font-semibold text-xl mb-2" style="color: var(--foreground);">Step 1 of 3: Duplicate the Sage Stocks Template</h3>
          <p class="mb-4" style="color: var(--muted-foreground);">
            First, duplicate our template into your Notion workspace. This creates all the databases you'll need for stock analysis.
          </p>

          <div class="mb-4 p-4 glass rounded-xl">
            <p class="text-sm mb-3" style="color: var(--muted-foreground);">
              <strong style="color: var(--foreground);">Important:</strong> You must duplicate the template <strong>before</strong> connecting your Notion account.
              This ensures the integration can access your duplicated pages.
            </p>
            <button
              id="open-template-button"
              class="btn-primary w-full"
            >
              📄 Open Template in Notion
            </button>
          </div>

          <div class="p-4 glass rounded-xl mb-4" style="border: 1px solid var(--solar-orange);">
            <p class="font-medium mb-2" style="color: var(--solar-orange);">📋 Instructions:</p>
            <ol class="text-sm space-y-2 ml-4 list-decimal" style="color: var(--muted-foreground);">
              <li>Click "Open Template in Notion" above</li>
              <li>In Notion, click the <strong style="color: var(--foreground);">Duplicate</strong> button in the top-right</li>
              <li>Select your workspace and confirm</li>
              <li>Wait for the template to finish duplicating (this can take up to 5–6 minutes)</li>
              <li>Come back here and check the box below to confirm</li>
            </ol>
            <p class="text-xs mt-3" style="color: var(--muted-foreground);">
              If Notion is still working, give it time — every database needs to finish syncing before you continue.
            </p>
          </div>

          <div class="mb-4 p-4 glass rounded-xl">
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                id="template-duplicated-checkbox"
                class="mt-1 w-5 h-5 rounded focus:ring-2"
                style="accent-color: var(--tech-green);"
              />
              <div class="flex-1">
                <p class="text-sm font-medium" style="color: var(--foreground);">I can see "Sage Stocks" in my Notion workspace sidebar</p>
                <p class="text-xs mt-1" style="color: var(--muted-foreground);">Make sure the template has finished duplicating before checking this box</p>
              </div>
            </label>
          </div>

          <p class="text-sm mb-4 hidden" id="template-duplicated-confirmation" style="color: var(--tech-green);">
            ✅ Great — your Sage Stocks workspace is ready. Next, you'll connect your Notion account and grant access to this template.
          </p>

          <button
            id="template-duplicated-button"
            class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            ✅ Continue to Connect Notion
          </button>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  setTimeout(async () => {
    const openTemplateButton = section.querySelector('#open-template-button');
    const duplicatedButton = section.querySelector('#template-duplicated-button');
    const duplicatedCheckbox = section.querySelector('#template-duplicated-checkbox');
    const duplicatedConfirmation = section.querySelector('#template-duplicated-confirmation');

    // Fetch template URL
    if (openTemplateButton) {
      openTemplateButton.addEventListener('click', async () => {
        try {
          const response = await fetch('/api/setup/template-url');
          const data = await response.json();
          
          if (data.success && data.url) {
            window.open(data.url, '_blank');
          } else {
            alert('Failed to get template URL. Please contact support.');
          }
        } catch (error) {
          console.error('Failed to fetch template URL:', error);
          alert('Failed to open template. Please contact support.');
        }
      });
    }

    // Enable/disable button based on checkbox
    if (duplicatedCheckbox && duplicatedButton) {
      duplicatedCheckbox.addEventListener('change', () => {
        duplicatedButton.disabled = !duplicatedCheckbox.checked;
        if (duplicatedConfirmation) {
          duplicatedConfirmation.classList.toggle('hidden', !duplicatedCheckbox.checked);
        }
      });
    }

    // Move to Step 2 (OAuth) after template is duplicated
    // NOTE: We don't call advanceToStep here because user isn't authenticated yet
    // We just update local state and render Step 2
    if (duplicatedButton) {
      duplicatedButton.addEventListener('click', () => {
        // Update local state (no API call needed - user isn't authenticated yet)
        currentState.currentStep = 2;
        currentState.completedSteps = [1];
        
        // Re-render the UI
        renderSubwayMap();
        renderStepContent();
        
        console.log('✓ Moved to Step 2: Connect Notion');
      });
    }
  }, 0);

  return section;
}

// ============================================================================
// Step 2: Connect Notion (OAuth - AFTER template duplication)
// ============================================================================

function createStep2Content() {
  const section = document.createElement('div');
  section.className = 'slide-in';

  // v1.2.9: Detect mobile/tablet devices
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const mobileWarning = isMobile ? `
    <div class="mb-4 p-4 glass rounded-xl" style="border: 1px solid var(--solar-orange);">
      <p class="font-medium mb-2" style="color: var(--solar-orange);">📱 Mobile Device Detected</p>
      <p class="text-sm" style="color: var(--muted-foreground);">
        <strong style="color: var(--foreground);">Important:</strong> Setup works best on desktop. If you encounter issues, please visit this page on a desktop computer for the smoothest experience.
      </p>
    </div>
  ` : '';

  // Check if we have saved email in localStorage
  const savedEmail = localStorage.getItem('sage_stocks_user_email');
  const hasSession = document.cookie.includes('si_session=');

  // If we have session or saved email, skip email input
  const needsEmailInput = !hasSession && !savedEmail;

  section.innerHTML = `
    ${mobileWarning}
    <div class="mb-6 p-6 glass-strong rounded-2xl">
      <div class="flex items-start gap-4">
        <div class="text-4xl">🔗</div>
        <div class="flex-1">
          <h3 class="font-semibold text-xl mb-2" style="color: var(--foreground);">Step 2 of 3: Connect Your Notion Account</h3>
          <p class="mb-4" style="color: var(--muted-foreground);">
            Now connect your Notion account. <strong style="color: var(--foreground);">Important:</strong> When Notion asks which pages to share,
            make sure to <strong>select your duplicated Sage Stocks page</strong> so the integration can access it.
          </p>

          <div class="mb-4 p-4 glass rounded-xl" style="border: 1px solid var(--solar-orange);">
            <p class="font-medium mb-2" style="color: var(--solar-orange);">⚠️ Critical Step:</p>
            <p class="text-sm" style="color: var(--muted-foreground);">
              During OAuth, Notion will ask "Which pages do you want to share?"
              You <strong style="color: var(--foreground);">must select your duplicated Sage Stocks page</strong> from the list.
              If you don't see it, make sure you completed Step 1 and the template finished duplicating.
            </p>
          </div>

          ${needsEmailInput ? `
            <div class="mb-4 p-4 glass rounded-xl">
              <label class="block text-sm font-medium mb-2" style="color: var(--foreground);">
                📧 Enter your email to get started
              </label>
              <p class="text-xs mb-3" style="color: var(--muted-foreground);">
                We'll use this to identify your account and send you updates. You only need to enter this once per browser.
              </p>
              <div class="flex gap-2">
                <input
                  type="email"
                  id="user-email-input"
                  placeholder="your@email.com"
                  class="input-glass flex-1"
                  required
                />
              </div>
              <p id="email-error" class="hidden text-sm mt-2" style="color: var(--crimson);"></p>
            </div>
          ` : savedEmail ? `
            <div class="mb-4 p-3 glass rounded-xl">
              <p class="text-sm" style="color: var(--muted-foreground);">
                📧 Signing in as: <strong style="color: var(--foreground);">${savedEmail}</strong>
                <button
                  onclick="localStorage.removeItem('sage_stocks_user_email'); window.location.reload();"
                  class="ml-2 text-xs underline"
                  style="color: var(--electric-blue);"
                >
                  Change email
                </button>
              </p>
            </div>
          ` : ''}

          <div class="mb-4 p-4 glass rounded-xl" style="border: 1px solid var(--solar-orange);">
            <p class="text-sm font-semibold mb-2" style="color: var(--solar-orange);">When Notion asks "Which pages do you want to share?", select your duplicated Sage Stocks page.</p>
            <p class="text-sm" style="color: var(--muted-foreground);">If you skip this step the integration can't reach your databases.</p>
            <p class="text-xs mt-2" style="color: var(--muted-foreground);"><strong style="color: var(--foreground);">What if you don't see it?</strong> Click "Select pages" → "Reload" in Notion, or go back to Step 1 to duplicate again.</p>
          </div>

          <p class="text-sm mb-4" style="color: var(--muted-foreground);">
            By signing in, you authorize Sage Stocks to create and write to a template in your Notion workspace.
          </p>
          <button
            id="signin-button"
            class="btn-primary inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/assets/notion-logo.png" alt="Notion" class="w-5 h-5 mr-2" onerror="this.style.display='none'" />
            Sign in with Notion
          </button>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners after render
  setTimeout(() => {
    const emailInput = section.querySelector('#user-email-input');
    const signinButton = section.querySelector('#signin-button');
    const emailError = section.querySelector('#email-error');

    if (signinButton) {
      signinButton.addEventListener('click', async () => {
        // If we need email input, validate it first
        if (needsEmailInput && emailInput) {
          const email = emailInput.value.trim();

          // Basic email validation
          if (!email || !email.includes('@') || !email.includes('.')) {
            if (emailError) {
              emailError.textContent = 'Please enter a valid email address';
              emailError.classList.remove('hidden');
            }
            emailInput.focus();
            return;
          }

          if (emailError) {
            emailError.classList.add('hidden');
          }

          // Disable button and show loading
          signinButton.disabled = true;
          signinButton.innerHTML = '<span class="inline-block spinner mr-2" style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%;"></span> Verifying...';

          // Call handleSetupStart with email (v1.2.14)
          await handleSetupStart(email);
        } else {
          // No email needed, proceed directly (v1.2.14)
          await handleSetupStart();
        }
      });

      // Allow Enter key to submit
      if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            signinButton.click();
          }
        });
      }
    }
  }, 0);

  return section;
}

// ============================================================================
// Step 3: Verify Workspace & Run First Analysis (After OAuth)
// ============================================================================

/**
 * Step 3: Verify Workspace (After OAuth)
 *
 * Runs AFTER OAuth callback. Verifies that the integration can access the
 * duplicated Sage Stocks template and runs database detection.
 */
function createStep3Content() {
  const section = document.createElement('div');
  section.className = 'slide-in';

  section.innerHTML = `
    <div class="mb-6 p-6 glass-strong rounded-2xl">
      <div class="flex items-start gap-4">
        <div class="text-4xl">✅</div>
        <div class="flex-1">
          <h3 class="font-semibold text-xl mb-2" style="color: var(--foreground);">Step 3 of 3: Verify Your Workspace</h3>

          <!-- Checking State -->
          <div id="step3-checking">
            <p class="mb-4" style="color: var(--muted-foreground);">
              Verifying your Notion workspace and detecting databases...
            </p>
            <div class="flex items-center gap-2">
              <span class="inline-block spinner" style="width: 20px; height: 20px;"></span>
              <span class="text-sm" style="color: var(--muted-foreground);">This will only take a moment</span>
            </div>
          </div>

          <!-- Workspace Verified - Show Analysis UI -->
          <div id="step3-verified" class="hidden">
            <div class="p-4 glass rounded-xl mb-4" style="border: 1px solid var(--tech-green);">
              <p class="font-medium mb-2" style="color: var(--tech-green);">✅ Workspace Verified!</p>
              <p class="text-sm" style="color: var(--muted-foreground);">Your Sage Stocks workspace is set up and ready to use.</p>
              <p class="text-xs mt-1" style="color: var(--muted-foreground);">All required databases are connected. You're ready to run your first analysis.</p>
            </div>
            <!-- Analysis UI will be shown here -->
            <div id="step3-analysis-ui"></div>
          </div>

          <!-- Workspace Not Found (Error State) -->
          <div id="step3-error" class="hidden">
            <div class="p-4 glass rounded-xl mb-4" style="border: 1px solid var(--crimson);">
              <p class="font-medium mb-2" style="color: var(--crimson);">❌ Integration Cannot Access Your Workspace</p>
              <p class="text-sm mb-3" style="color: var(--muted-foreground);">
                The integration cannot see your Sage Stocks workspace. This usually means the integration wasn't connected to your duplicated pages during OAuth.
              </p>
              <p class="text-sm font-semibold mb-2" style="color: var(--crimson);">To fix this:</p>
              <ol class="text-sm space-y-2 ml-4 list-decimal" style="color: var(--muted-foreground);">
                <li>Make sure you duplicated the Sage Stocks template in Step 1.</li>
                <li>Click "Start Over" below, redo Step 1 (duplicate) and Step 2 (connect), and when Notion shows "Select pages" choose your Sage Stocks page, then click Allow access.</li>
                <li>Prefer not to redo OAuth? In Notion, open your Sage Stocks page → Click <code>⋯</code> → "Add connections" → Select "Sage Stocks" integration. This won't delete any existing data.</li>
              </ol>
            </div>
            <div class="flex flex-col sm:flex-row gap-3">
              <button
                id="step3-retry"
                class="btn-primary"
              >
                🔄 Check Again
              </button>
              <button
                id="step3-restart"
                class="btn-secondary"
              >
                ← Start Over
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Setup event listeners after render
  setTimeout(async () => {
    const checkingDiv = section.querySelector('#step3-checking');
    const verifiedDiv = section.querySelector('#step3-verified');
    const errorDiv = section.querySelector('#step3-error');
    const analysisUi = section.querySelector('#step3-analysis-ui');
    const retryButton = section.querySelector('#step3-retry');
    const restartButton = section.querySelector('#step3-restart');

    // Function to check for template and run detection
    async function checkForTemplate() {
      try {
        console.log('🔍 Verifying Sage Stocks workspace...');
        const response = await fetch('/api/setup/check-template');
        const data = await response.json();

        if (data.hasTemplate) {
          console.log('✅ Workspace verified:', data.templateId);
          if (checkingDiv) checkingDiv.classList.add('hidden');
          if (verifiedDiv) verifiedDiv.classList.remove('hidden');
          
          // Trigger auto-detection
          await triggerAutoDetection();
          
          // Show analysis UI
          if (analysisUi) {
            analysisUi.innerHTML = createAnalysisUI();
            setupAnalysisListeners(analysisUi);
          }
        } else {
          console.warn('❌ No workspace found - user may not have duplicated template');
          if (checkingDiv) checkingDiv.classList.add('hidden');
          if (errorDiv) errorDiv.classList.remove('hidden');
        }
      } catch (error) {
        console.error('❌ Failed to verify workspace:', error);
        if (checkingDiv) checkingDiv.classList.add('hidden');
        if (errorDiv) errorDiv.classList.remove('hidden');
      }
    }

    // Initial check
    await checkForTemplate();

    // Retry button
    if (retryButton) {
      retryButton.addEventListener('click', async () => {
        // Hide error, show checking
        if (errorDiv) errorDiv.classList.add('hidden');
        if (checkingDiv) checkingDiv.classList.remove('hidden');

        // Check again
        await checkForTemplate();
      });
    }

    // Restart button
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        // Clear everything and start over
        localStorage.removeItem('sage_stocks_user_email');
        window.location.href = '/';
      });
    }
  }, 0);

  return section;
}

// Helper function to create analysis UI
function createAnalysisUI() {
  return `
    <div class="mb-6 p-6 glass rounded-xl">
      <div class="flex items-start gap-4">
        <div class="text-4xl">📊</div>
        <div class="flex-1">
          <h3 class="font-semibold text-xl mb-2" style="color: var(--foreground);">Run Your First Analysis</h3>
          <p class="mb-4" style="color: var(--muted-foreground);">
            Your workspace is ready! Enter any ticker symbol (like AAPL, TSLA, or GOOGL) and we'll generate a comprehensive analysis in your Notion workspace.
          </p>
          <p class="text-xs mb-4" style="color: var(--muted-foreground);">
            This usually takes 1–3 minutes. You can keep this tab open — we'll update here when your Notion pages are ready.
          </p>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2" style="color: var(--foreground);">Enter Ticker Symbol</label>
            <input
              type="text"
              id="ticker-input"
              placeholder="e.g., AAPL"
              class="input-glass w-full uppercase"
              maxlength="10"
            />
          </div>
          <button
            id="analyze-button"
            disabled
            class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📊 Analyze Stock
          </button>
          <div id="analysis-status" class="hidden mt-4"></div>
          <p class="text-xs mt-3" style="color: var(--muted-foreground);">Keep this tab open; we'll update this status as soon as your Notion workspace is ready.</p>
        </div>
      </div>
    </div>
  `;
}

// Helper function to setup analysis listeners
function setupAnalysisListeners(container) {
  const input = container.querySelector('#ticker-input');
  const button = container.querySelector('#analyze-button');
  const statusDiv = container.querySelector('#analysis-status');

  if (input && button && statusDiv) {
    input.addEventListener('input', () => {
      button.disabled = input.value.trim().length < 1;
    });

    button.addEventListener('click', async () => {
      await runFirstAnalysis(input.value.trim().toUpperCase(), button, statusDiv);
    });

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && input.value.trim().length >= 1) {
        runFirstAnalysis(input.value.trim().toUpperCase(), button, statusDiv);
      }
    });
  }
}

// ============================================================================
// Analysis Functions (used by Step 3)
// ============================================================================

async function runFirstAnalysis(ticker, button = null, statusDiv = null) {
  // Use provided elements or fall back to document search
  button = button || document.getElementById('analyze-button');
  statusDiv = statusDiv || document.getElementById('analysis-status');

  if (!button || !statusDiv) {
    console.error('Analysis UI elements not found');
    return;
  }

  button.disabled = true;
  button.innerHTML = '<span class="inline-block spinner mr-2" style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%;"></span> Starting analysis...';

  statusDiv.classList.remove('hidden');
  statusDiv.innerHTML = `
    <div class="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
      <p class="text-blue-800 font-medium">🚀 Starting analysis for ${ticker}...</p>
      <p class="text-sm text-blue-700 mt-1">This will take 60-140 seconds. Hang tight!</p>
    </div>
  `;

  try {
    // Detect user's timezone automatically
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker,
        timezone: userTimezone,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      // Extract error message properly - handle object errors
      const errorMsg = typeof data.error === 'string'
        ? data.error
        : (data.error?.message || data.message || JSON.stringify(data.error) || 'Analysis failed');
      throw new Error(errorMsg);
    }

    // 🎉 CONFETTI TIME!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Mark step 3 as complete and setup as complete
    if (!currentState.completedSteps.includes(3)) {
      currentState.completedSteps.push(3);
      renderSubwayMap();
    }
    currentState.setupComplete = true;

    // Build Notion URLs
    const analysisUrl = data.analysesPageId ? `https://notion.so/${data.analysesPageId.replace(/-/g, '')}` : null;
    const workspaceUrl = data.sageStocksPageId ? `https://notion.so/${data.sageStocksPageId.replace(/-/g, '')}` : null;

    statusDiv.innerHTML = `
      <div class="p-6 bg-green-50 border-2 border-green-300 rounded-lg">
        <p class="text-green-800 font-bold text-lg mb-3">🎉 Setup Complete!</p>
        <p class="text-sm text-green-700 mb-4">
          Your first analysis for <strong>${ticker}</strong> is ready in Notion. You can now access your workspace anytime.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 mb-4">
          ${analysisUrl ? `
            <a
              href="${analysisUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 text-center"
            >
              📄 View This Analysis →
            </a>
          ` : ''}
          ${workspaceUrl ? `
            <a
              href="${workspaceUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 text-center"
            >
              📊 View Sage Stocks Workspace →
            </a>
          ` : ''}
        </div>

        <div class="text-sm text-gray-700 bg-white p-4 rounded-lg border border-green-200">
          <p class="font-medium mb-2">What's next?</p>
          <ul class="ml-4 list-disc space-y-1">
            <li>Access your Stock Analyses and History databases</li>
            <li>View AI-generated insights and recommendations</li>
            <li>Run more analyses from the <a href="/pages/analyze.html" class="text-blue-600 hover:underline">analyzer page</a></li>
          </ul>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('❌ Analysis failed:', error);

    // Extract error message properly
    const errorMessage = error.message || (typeof error === 'string' ? error : 'An unexpected error occurred');

    statusDiv.innerHTML = `
      <div class="p-4 bg-red-50 border-l-4 border-red-400 rounded">
        <p class="text-red-800 font-medium mb-1">❌ Analysis failed</p>
        <p class="text-sm text-red-700">${errorMessage}</p>
        <button
          id="retry-analysis"
          class="mt-3 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-all"
        >
          Try Again
        </button>
      </div>
    `;

    button.disabled = false;
    button.innerHTML = '📊 Analyze Stock';

    // Setup retry button
    const retryBtn = statusDiv.querySelector('#retry-analysis');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        runFirstAnalysis(ticker);
      });
    }
  }
}

// ============================================================================
// Step 5: View Results
// ============================================================================

function createStep5Content() {
  const section = document.createElement('div');
  section.className = 'slide-in';

  const analysisUrl = currentState.setupProgress?.step5AnalysisUrl || '#';
  const ticker = currentState.setupProgress?.step4FirstTicker || 'your stock';

  section.innerHTML = `
    <div class="mb-6 p-6 rounded-lg border bg-purple-50 border-purple-200">
      <div class="text-center py-8">
        <div class="text-6xl mb-4">🎉</div>
        <h3 class="font-bold text-gray-900 text-2xl mb-2">Almost There!</h3>
        <p class="text-gray-700 text-lg mb-6">
          Your analysis for <strong>${ticker}</strong> is ready in your Notion workspace!
        </p>
        <button
          onclick="window.open('${analysisUrl}', '_blank'); document.getElementById('mark-complete').classList.remove('hidden');"
          class="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl text-lg"
        >
          👁️ Open Analysis in Notion
        </button>
        <div id="mark-complete" class="hidden mt-6">
          <p class="text-sm text-gray-600 mb-3">Seen your analysis? Let's finish setup!</p>
          <button
            onclick="completeSetup()"
            class="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all"
          >
            ✓ I've Viewed My Analysis - Complete Setup
          </button>
        </div>
      </div>
    </div>
  `;

  return section;
}

async function completeSetup() {
  // Set localStorage flag to prevent duplicate templates on re-authentication
  localStorage.setItem('sage_stocks_setup_complete', 'true');
  console.log('✅ Setup complete flag set in localStorage');

  await advanceToStep(6);
}

// ============================================================================
// Step 6: Complete!
// ============================================================================

function createStep6Content() {
  const section = document.createElement('div');
  section.className = 'slide-in';
  section.innerHTML = `
    <div class="mb-6 p-6 rounded-lg border bg-green-50 border-green-200">
      <div class="text-center py-12">
        <div class="text-7xl mb-4">🎉</div>
        <h3 class="font-bold text-gray-900 text-3xl mb-3">You're All Set!</h3>
        <p class="text-gray-700 text-lg mb-6">
          Your Sage Stocks workspace is fully configured and ready for daily analysis.
        </p>
        <div class="bg-white border border-green-200 rounded-xl p-6 max-w-md mx-auto mb-6">
          <div class="space-y-3 text-left">
            <p class="text-green-800 flex items-center gap-2">
              <span class="font-medium">✓</span> Template duplicated and connected
            </p>
            <p class="text-green-800 flex items-center gap-2">
              <span class="font-medium">✓</span> Databases auto-detected and verified
            </p>
            <p class="text-green-800 flex items-center gap-2">
              <span class="font-medium">✓</span> First analysis completed
            </p>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-4">Redirecting to your analyzer in <span id="countdown">3</span> seconds...</p>
        <button
          onclick="window.location.href='/pages/analyze.html'"
          class="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl text-lg"
        >
          Go to Analyzer Now →
        </button>
      </div>
    </div>
  `;

  // Countdown redirect
  let countdown = 3;
  const countdownEl = document.getElementById('countdown');
  const interval = setInterval(() => {
    countdown--;
    if (countdownEl) {
      countdownEl.textContent = countdown;
    }
    if (countdown <= 0) {
      clearInterval(interval);
      window.location.href = '/pages/analyze.html';
    }
  }, 1000);

  return section;
}

// ============================================================================
// Error Handling & UI Helpers
// ============================================================================

function clearErrors() {
  const container = document.getElementById('setup-content');
  if (!container) return;
  container.querySelectorAll('.setup-error').forEach((node) => node.remove());
}

function showError(message) {
  const container = document.getElementById('setup-content');
  if (!container) return;

  clearErrors();

  const errorDiv = document.createElement('div');
  errorDiv.className = 'setup-error glass rounded-xl p-4 mb-6 slide-in';
  errorDiv.style.borderLeft = '4px solid var(--crimson)';
  errorDiv.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="text-xl flex-shrink-0" style="color: var(--crimson);">⚠️</span>
      <div class="flex-1">
        <p class="font-medium" style="color: var(--crimson);">Error</p>
        <p class="text-sm mt-1" style="color: var(--muted-foreground);">${message}</p>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="flex-shrink-0" style="color: var(--crimson);">
        ✕
      </button>
    </div>
  `;

  container.insertBefore(errorDiv, container.firstChild);
}

function showStatusMessage(status) {
  const container = document.getElementById('setup-content');
  if (!container) return;

  const messages = {
    pending: {
      icon: '⏳',
      title: 'Account Pending Approval',
      message: 'Your account has been created and is awaiting admin approval. You\'ll receive an email when approved (usually within 24 hours). Once approved, refresh this page to continue.',
      color: 'yellow'
    },
    denied: {
      icon: '❌',
      title: 'Access Denied',
      message: 'Your account application has been denied. Please contact support if you believe this is an error.',
      color: 'red'
    }
  };

  const msg = messages[status];
  if (!msg) return;

  container.innerHTML = `
    <div class="p-6 bg-${msg.color}-50 border border-${msg.color}-200 rounded-lg">
      <div class="flex items-start gap-4">
        <div class="text-3xl">${msg.icon}</div>
        <div class="flex-1">
          <p class="text-${msg.color}-800 font-medium text-lg">${msg.title}</p>
          <p class="text-${msg.color}-700 text-sm mt-1">${msg.message}</p>
          ${status === 'pending' ? `
            <button
              id="refresh-status-btn"
              onclick="refreshStatusAndDetect()"
              class="mt-4 px-4 py-2 bg-${msg.color}-600 text-white font-semibold rounded-lg hover:bg-${msg.color}-700 transition-all"
            >
              🔄 Refresh Status
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function getErrorMessage(errorCode) {
  const messages = {
    'access_denied': 'You denied access to your Notion workspace. Please try again and grant access.',
    'missing_code': 'Authorization code missing. Please try signing in again.',
    'server_config': 'Server configuration error. Please contact support.',
    'token_exchange_failed': 'Failed to complete authentication. Please try again.',
    'oauth_failed': 'Authentication failed. Please try again or contact support.',
    'unknown_status': 'Unexpected error occurred. Please contact support.',
  };

  return messages[errorCode] || 'An error occurred during setup. Please try again.';
}

/**
 * Refresh status and trigger database detection
 * Called by the "Refresh Status" button for pending users
 */
async function refreshStatusAndDetect() {
  const btn = document.getElementById('refresh-status-btn');
  if (!btn) return;

  // Show loading state
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-block spinner mr-2" style="width: 16px; height: 16px; border: 2px solid white; border-top-color: transparent; border-radius: 50%;"></span> Detecting databases...';

  try {
    console.log('🔄 Refresh Status clicked - triggering database detection');

    // Trigger database detection
    const response = await fetch('/api/setup/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    console.log('📊 Detection response:', data);

    if (data.success) {
      console.log('✅ Detection completed successfully');
      // Reload page to show updated status
      window.location.reload();
    } else {
      console.error('❌ Detection failed:', data.error);
      // Show error but still reload to show current state
      alert(`Detection failed: ${data.error || 'Unknown error'}\n\nCheck Vercel logs for details.`);
      window.location.reload();
    }
  } catch (error) {
    console.error('❌ Detection request failed:', error);
    alert(`Failed to trigger detection: ${error.message}\n\nCheck Vercel logs for details.`);
    // Restore button state
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// Make functions globally accessible for inline onclick handlers
window.completeSetup = completeSetup;
window.refreshStatusAndDetect = refreshStatusAndDetect;
