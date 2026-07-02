export function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <h1>Tutorial</h1>
      <p>Step-by-step guide to using Forma Asset Manager.</p>
    </div>

    <!-- Step 0: APS App -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">0</span>
        <h2>Before you start — Create an APS Application</h2>
      </div>
      <p>You need an <strong>Autodesk Platform Services (APS)</strong> app to authenticate with the API.</p>
      <ol class="help-list">
        <li>Go to <a href="https://aps.autodesk.com" target="_blank" rel="noopener">aps.autodesk.com</a> and sign in with your Autodesk account.</li>
        <li>Navigate to <strong>My Apps → Create App</strong>.</li>
        <li>Choose <strong>Traditional Web App</strong> as the app type.</li>
        <li>Set the callback URL to exactly: <code class="inline-code">http://localhost:3000/auth/callback</code></li>
        <li>Enable the <strong>Autodesk Construction Cloud API</strong> (includes Forma Build / ACC Assets).</li>
        <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong> — you will need them in the next step.</li>
      </ol>
    </div>

    <!-- Step 1: Setup -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">1</span>
        <h2>Configure the App</h2>
      </div>
      <p>On first launch, the app shows a <strong>Configure App</strong> screen.</p>
      <ol class="help-list">
        <li>Enter your <strong>APS Client ID</strong> and <strong>Client Secret</strong>.</li>
        <li>Click <strong>Save &amp; Authenticate</strong>. Your credentials are stored only in your browser session — never on disk.</li>
        <li>To reconfigure later, click <em>Reconfigure credentials</em> on the authentication screen.</li>
      </ol>
    </div>

    <!-- Step 2: Auth -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">2</span>
        <h2>Authenticate with Autodesk</h2>
      </div>
      <p>The app uses <strong>3-legged OAuth 2.0</strong> — you authenticate as yourself, so your project permissions apply.</p>
      <ol class="help-list">
        <li>Click <strong>Authenticate with Autodesk</strong>.</li>
        <li>You will be redirected to Autodesk's login page. Sign in and authorise the app.</li>
        <li>You are redirected back to the app. The topbar shows <span class="help-chip green">● Authenticated</span>.</li>
        <li>The token expires after <strong>1 hour</strong>. Click <em>Sign out</em> and re-authenticate if it expires.</li>
      </ol>
    </div>

    <!-- Step 3: Select project -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">3</span>
        <h2>Select a Project</h2>
      </div>
      <p>Both <strong>Import</strong> and <strong>Export</strong> pages start with a <em>Select Project</em> panel.</p>
      <ol class="help-list">
        <li>Choose a <strong>Hub</strong> from the first dropdown. Hubs correspond to your BIM 360 / ACC accounts.</li>
        <li>Choose a <strong>Project</strong> from the second dropdown. Only projects you have access to are shown.</li>
        <li>A green badge confirms the selected project. The selection is remembered across page visits.</li>
        <li>You can use <strong>different projects</strong> for Import and Export — useful for copying categories between projects.</li>
      </ol>
    </div>

    <!-- Step 4: Export -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">4</span>
        <h2>Export Asset Categories</h2>
      </div>
      <p>Export extracts all Asset Categories from the selected project into a CSV file.</p>
      <ol class="help-list">
        <li>Go to <strong>Asset Categories → Export</strong>.</li>
        <li>Select the source project.</li>
        <li>Choose the CSV delimiter: <strong>semicolon</strong> is recommended for Excel compatibility in most locales; use <strong>comma</strong> for English-locale Excel or Google Sheets.</li>
        <li>Click <strong>Preview</strong> to see the categories in a table before downloading.</li>
        <li>Click <strong>Export &amp; Download</strong> to save the file as <code class="inline-code">AssetCategories.csv</code>.</li>
      </ol>
      <div class="help-tip">
        <span class="help-tip-icon">💡</span>
        <div>Use Export to back up your category structure, or as the starting point for migrating categories to another project.</div>
      </div>
    </div>

    <!-- Step 5: CSV format -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">5</span>
        <h2>CSV Format</h2>
      </div>
      <p>The CSV uses these five columns:</p>
      <div class="table-wrap" style="margin-bottom:16px">
        <table>
          <thead>
            <tr>
              <th>Column</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><code class="inline-code">name</code></td><td>✓</td><td>Category name. Must be unique within its parent.</td></tr>
            <tr><td><code class="inline-code">description</code></td><td>✓</td><td>Category description. Defaults to the name if empty.</td></tr>
            <tr><td><code class="inline-code">parentId</code></td><td>one of the two</td><td>Parent category ID (raw GUID). Leave empty when using parentPath.</td></tr>
            <tr><td><code class="inline-code">parentPath</code></td><td>one of the two</td><td>Parent category path (e.g. <code class="inline-code">Bridges/Foundations</code>). Leave empty for root-level categories.</td></tr>
            <tr><td><code class="inline-code">statusSetName</code></td><td>—</td><td>Name of the Status Set to assign. Only applies to root-level categories.</td></tr>
          </tbody>
        </table>
      </div>
      <p><strong>Using parentPath (recommended):</strong> define hierarchy by path, not by ID. For example:</p>
      <div class="help-code-block">
        <pre>name;description;parentId;parentPath;statusSetName
Bridges;Bridges category;;;Bridge Status
Foundations;Foundations;;Bridges;
Footings;Footings;;Bridges/Foundations;</pre>
      </div>
      <div class="help-tip">
        <span class="help-tip-icon">⚠</span>
        <div>When using <code class="inline-code">parentPath</code>, make sure every parent in the path is either already in the project or defined earlier in the same CSV. The importer sorts by depth automatically.</div>
      </div>
    </div>

    <!-- Step 6: Import -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">6</span>
        <h2>Import Asset Categories</h2>
      </div>
      <ol class="help-list">
        <li>Go to <strong>Asset Categories → Import</strong>.</li>
        <li>Select the destination project.</li>
        <li>Drag and drop your CSV file onto the upload area, or click to browse.</li>
        <li>A preview table shows the first 20 rows so you can verify the content.</li>
        <li>Enable <strong>Dry Run</strong> (default: on) to simulate the import without making any changes. Review the log and disable Dry Run only when you are ready to commit.</li>
        <li>Click <strong>Import</strong>. The log streams in real time showing each operation:
          <ul class="help-sub-list">
            <li><span class="log-icon created">✓</span> <strong>CREATED</strong> — new category created</li>
            <li><span class="log-icon skip">–</span> <strong>SKIP</strong> — category already exists, not modified</li>
            <li><span class="log-icon assigned">★</span> <strong>ASSIGNED</strong> — Status Set linked to category</li>
            <li><span class="log-icon warning">⚠</span> <strong>WARNING</strong> — non-blocking issue</li>
            <li><span class="log-icon error">✗</span> <strong>ERROR</strong> — blocking issue, import stopped</li>
          </ul>
        </li>
        <li>The summary chips at the bottom show the final count of created, skipped, and assigned items.</li>
      </ol>
    </div>

    <!-- Step 7: Copy between projects -->
    <div class="card help-card">
      <div class="help-step-header">
        <span class="help-step-num">7</span>
        <h2>Copy Categories Between Projects</h2>
      </div>
      <p>A common use case — migrate the category structure from one project to another:</p>
      <ol class="help-list">
        <li>Go to <strong>Export</strong>, select the <em>source</em> project, and download the CSV.</li>
        <li>Go to <strong>Import</strong>, select the <em>destination</em> project.</li>
        <li>Upload the exported CSV. Run a Dry Run first to verify.</li>
        <li>Disable Dry Run and click Import.</li>
      </ol>
      <div class="help-tip">
        <span class="help-tip-icon">💡</span>
        <div>The exported CSV uses <code class="inline-code">parentPath</code> (not IDs), so it is portable across projects regardless of how the IDs differ.</div>
      </div>
    </div>
  `;
}
