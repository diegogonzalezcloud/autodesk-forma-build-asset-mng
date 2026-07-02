export function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>About</h1>
      <p>Forma Asset Manager — open-source tool for Autodesk Forma Build.</p>
    </div>

    <!-- App info -->
    <div class="card about-card">
      <div class="about-app-header">
        <span class="about-logo">&#9670;</span>
        <div>
          <h2 class="about-app-name">Forma Asset Manager</h2>
          <span class="about-version">v1.0.0</span>
        </div>
      </div>
      <p style="margin-top:12px">
        A browser-based tool for managing <strong>Asset Categories</strong> in
        <strong>Autodesk Forma / Autodesk Construction Cloud (ACC)</strong> projects.
        Import categories in bulk from a CSV file, export an existing category structure,
        and copy hierarchies between projects — all without writing a single line of code.
      </p>
      <p style="margin-top:8px">
        Built as a local web application that runs entirely on your machine.
        Your APS credentials are stored only in your browser session and never leave your computer.
      </p>
    </div>

    <!-- APIs -->
    <div class="card">
      <div class="card-title">APIs &amp; Technologies</div>
      <div class="about-api-list">

        <div class="about-api-item">
          <div class="about-api-icon">&#128279;</div>
          <div>
            <div class="about-api-name">
              <a href="https://aps.autodesk.com/en/docs/acc/v1/reference/http/assets-categories-GET/" target="_blank" rel="noopener">
                Autodesk ACC Assets API
              </a>
            </div>
            <div class="about-api-desc">
              Used to list, create, and manage Asset Categories and Status Step Sets
              in Autodesk Construction Cloud / Forma Build projects.
              Part of the <a href="https://aps.autodesk.com" target="_blank" rel="noopener">Autodesk Platform Services (APS)</a>.
            </div>
          </div>
        </div>

        <div class="about-api-item">
          <div class="about-api-icon">&#128218;</div>
          <div>
            <div class="about-api-name">
              <a href="https://aps.autodesk.com/en/docs/data/v2/reference/http/hubs-GET/" target="_blank" rel="noopener">
                APS Data Management API
              </a>
            </div>
            <div class="about-api-desc">
              Used to browse hubs and projects accessible to the authenticated user.
            </div>
          </div>
        </div>

        <div class="about-api-item">
          <div class="about-api-icon">&#128274;</div>
          <div>
            <div class="about-api-name">
              <a href="https://aps.autodesk.com/en/docs/oauth/v2/reference/http/authorize-GET/" target="_blank" rel="noopener">
                APS Authentication API (OAuth 2.0 — 3-legged)
              </a>
            </div>
            <div class="about-api-desc">
              3-legged Authorization Code flow. The app acts on behalf of the authenticated user,
              respecting their project-level permissions.
            </div>
          </div>
        </div>

        <div class="about-api-item">
          <div class="about-api-icon">&#9881;</div>
          <div>
            <div class="about-api-name">Node.js + Express</div>
            <div class="about-api-desc">
              Local backend server handling OAuth callbacks, session management,
              and API proxying. Requires Node.js 18+.
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Author -->
    <div class="card">
      <div class="card-title">Author</div>
      <div class="about-author">
        <div class="about-author-avatar">DG</div>
        <div class="about-author-info">
          <div class="about-author-name">Diego González Pascual</div>
          <div class="about-author-bio">
            Digital workflows specialist with a focus on the AEC industry and Autodesk technologies.
            Building tools that make BIM and construction data more accessible.
          </div>
          <div class="about-links">
            <a class="about-link github" href="https://github.com/diegogonzalezcloud" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
            </a>
            <a class="about-link linkedin" href="https://www.linkedin.com/in/diegogonzalezpascual/" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a class="about-link youtube" href="https://www.youtube.com/@diegogonzalezcloud" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              YouTube — Flujos Digitales
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- License -->
    <div class="card">
      <div class="card-title">License</div>
      <p>Released under the <strong>MIT License</strong>. Free to use, modify, and distribute.</p>
      <p style="margin-top:8px;font-size:12.5px;color:var(--text-muted)">
        This tool is not an official Autodesk product and is not affiliated with or endorsed by Autodesk, Inc.
        Autodesk, Forma, BIM 360, and ACC are trademarks of Autodesk, Inc.
      </p>
    </div>
  `;
}
