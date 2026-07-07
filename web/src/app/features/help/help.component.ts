import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import { Subscription } from 'rxjs';

interface HelpTocItem {
  label: string;
  anchor: string;
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './help.component.html',
  styleUrl: './help.component.scss',
})
export class HelpComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fragmentSubscription?: Subscription;
  private pendingFragment = '';
  private readonly scrollOffset = 96;

  loading = signal(true);
  errorMessage = signal('');
  toc = signal<HelpTocItem[]>([]);
  manualHtml = signal('');

  ngOnInit(): void {
    this.fragmentSubscription = this.route.fragment.subscribe((fragment) => {
      if (!fragment) {
        return;
      }

      if (this.loading()) {
        this.pendingFragment = fragment;
        return;
      }

      this.scrollToFragmentAfterRender(fragment);
    });

    this.http.get('/manual-usuario-el-atico-admin.md', { responseType: 'text' })
      .subscribe({
        next: (markdown) => {
          const rendered = this.renderMarkdown(markdown);

          this.toc.set(rendered.toc);
          this.manualHtml.set(rendered.html);
          this.loading.set(false);

          const fragment = this.pendingFragment || this.route.snapshot.fragment || '';

          if (fragment) {
            this.scrollToFragmentAfterRender(fragment);
            this.pendingFragment = '';
          }
        },
        error: () => {
          this.errorMessage.set('No se pudo cargar el manual de usuario.');
          this.loading.set(false);
        },
      });
  }

  ngOnDestroy(): void {
    this.fragmentSubscription?.unsubscribe();
  }

  scrollToSection(event: Event, anchor: string): void {
    event.preventDefault();

    this.router.navigate(['/help'], { fragment: anchor }).then(() => {
      this.scrollToFragmentAfterRender(anchor);
    });
  }

  private scrollToFragmentAfterRender(fragment: string): void {
    if (!fragment) {
      return;
    }

    requestAnimationFrame(() => {
      setTimeout(() => {
        const element = document.getElementById(fragment);

        if (!element) {
          this.pendingFragment = fragment;
          return;
        }

        const targetTop =
          element.getBoundingClientRect().top + window.scrollY - this.scrollOffset;

        window.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth',
        });
      }, 0);
    });
  }

  private renderMarkdown(markdown: string): { html: string; toc: HelpTocItem[] } {
    const lines = markdown.split(/\r?\n/);
    const html: string[] = [];
    const toc: HelpTocItem[] = [];
    let paragraph: string[] = [];
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let tableRows: string[][] = [];

    const flushParagraph = () => {
      if (paragraph.length === 0) return;

      html.push(`<p>${this.renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    };

    const flushList = () => {
      if (!listType || listItems.length === 0) return;

      html.push(`<${listType}>${listItems.map((item) => `<li>${this.renderInline(item)}</li>`).join('')}</${listType}>`);
      listItems = [];
      listType = null;
    };

    const flushTable = () => {
      if (tableRows.length === 0) return;

      const [headers, ...rows] = tableRows;
      const bodyRows = rows.filter((row) => {
        return !row.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
      });

      html.push([
        '<div class="help-table-wrapper"><table>',
        '<thead><tr>',
        headers.map((cell) => `<th>${this.renderInline(cell)}</th>`).join(''),
        '</tr></thead>',
        '<tbody>',
        bodyRows.map((row) => {
          return `<tr>${row.map((cell) => `<td>${this.renderInline(cell)}</td>`).join('')}</tr>`;
        }).join(''),
        '</tbody></table></div>',
      ].join(''));

      tableRows = [];
    };

    const flushOpenBlocks = () => {
      flushParagraph();
      flushList();
      flushTable();
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed || trimmed === '---') {
        flushOpenBlocks();
        continue;
      }

      if (trimmed.startsWith('|')) {
        flushParagraph();
        flushList();
        tableRows.push(
          trimmed
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim()),
        );
        continue;
      }

      if (tableRows.length > 0) {
        flushTable();
      }

      const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);

      if (heading) {
        flushOpenBlocks();

        const level = heading[1].length;
        const title = heading[2].trim();

        if (level === 1 || title.startsWith('Guia operativa')) {
          continue;
        }

        const anchor = this.slugify(title);

        if (level === 2 && /^\d+\./.test(title)) {
          toc.push({
            label: title.replace(/^\d+\.\s*/, ''),
            anchor,
          });
        }

        html.push(`<h${level} id="${anchor}">${this.renderInline(title)}</h${level}>`);
        continue;
      }

      const quote = /^>\s*(.+)$/.exec(trimmed);

      if (quote) {
        flushOpenBlocks();
        html.push(`<blockquote>${this.renderInline(quote[1])}</blockquote>`);
        continue;
      }

      const unordered = /^-\s+(.+)$/.exec(trimmed);

      if (unordered) {
        flushParagraph();

        if (listType && listType !== 'ul') {
          flushList();
        }

        listType = 'ul';
        listItems.push(unordered[1]);
        continue;
      }

      const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);

      if (ordered) {
        flushParagraph();

        if (listType && listType !== 'ol') {
          flushList();
        }

        listType = 'ol';
        listItems.push(ordered[1]);
        continue;
      }

      flushList();
      paragraph.push(trimmed);
    }

    flushOpenBlocks();

    return {
      html: html.join('\n'),
      toc,
    };
  }

  private renderInline(value: string): string {
    return this.escapeHtml(value)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private slugify(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^\d+\.\s*/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
