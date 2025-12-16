import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatosService, Plato } from '@admin/services/platos.service';

@Component({
  selector: 'app-front-menu-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './front-menu-page.component.html',
  styles: ``,
})
export class FrontMenuPageComponent implements OnInit {
  private _platosService = inject(PlatosService);

  platos = signal<Plato[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadPlatos();
  }

  private loadPlatos(): void {
    this._platosService.getAll().subscribe({
      next: (platos) => {
        this.platos.set(platos);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Error loading platos:', error);
        this.loading.set(false);
      }
    });
  }

  getPlatosByCategoria(categoria?: string): Plato[] {
    if (!categoria) return this.platos().filter(p => !p.categoria);
    return this.platos().filter(p => p.categoria === categoria);
  }

  getCategorias(): string[] {
    const categorias = new Set<string>();
    this.platos().forEach(plato => {
      if (plato.categoria) categorias.add(plato.categoria);
    });
    return Array.from(categorias);
  }
}