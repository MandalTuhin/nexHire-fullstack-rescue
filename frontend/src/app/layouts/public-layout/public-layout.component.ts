import { Component } from '@angular/core';

@Component({
    selector: 'app-public-layout',
    template: `
    <div class="public-layout">
      <header class="public-header">
        <div class="header-container">
          <div class="logo" routerLink="/">
            <mat-icon class="logo-icon">rocket_launch</mat-icon>
            <span>NexHire</span>
          </div>
          <nav class="public-nav">
            <a routerLink="/" routerLinkActive="active-link" [routerLinkActiveOptions]="{exact: true}">Home</a>
            <a routerLink="/auth/login" routerLinkActive="active-link">Login</a>
            <a routerLink="/auth/register" routerLinkActive="active-link">Register</a>
          </nav>
        </div>
      </header>
      <main class="public-main">
        <router-outlet></router-outlet>
      </main>
      <footer class="public-footer">
        <p>&copy; 2026 NexHire Recruitment-to-Allocation Platform. All rights reserved.</p>
      </footer>
    </div>
  `,
    styles: [`
    .public-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background-color: var(--color-page-bg);
    }
    .public-header {
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      box-shadow: 0 1px 3px rgba(20, 14, 5, 0.04);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px 24px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 700;
      color: var(--color-text);
      cursor: pointer;
    }
    .logo-icon {
      color: var(--brand-500);
    }
    .public-nav {
      display: flex;
      gap: 20px;
      align-items: center;
    }
    .public-nav a {
      text-decoration: none;
      color: var(--color-text-muted);
      font-weight: 500;
      font-size: 14px;
      transition: color 0.2s;
    }
    .public-nav a:hover, .active-link {
      color: var(--brand-600) !important;
    }
    .public-main {
      flex: 1;
    }
    .public-footer {
      background-color: var(--ink-950);
      color: var(--ink-text-muted);
      text-align: center;
      padding: 24px;
      font-size: 14px;
    }
  `],
    standalone: false
})
export class PublicLayoutComponent {}
