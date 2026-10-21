import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientesService, Cliente } from '../../services/clientes.service';

@Component({
  selector: 'app-admin-clientes-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-clientes-page.component.html',
})
export class AdminClientesPageComponent implements OnInit {
  private clientesService = inject(ClientesService);
  private fb = inject(FormBuilder);

  Math = Math;

  clientes = signal<Cliente[]>([]);
  loading = signal(false);
  isModalOpen = signal(false);
  editingCliente = signal<Cliente | null>(null);

  // Búsqueda y Paginación
  searchQuery = signal<string>('');
  currentPage = signal<number>(1);
  pageSize = signal<number>(15);

  filteredClientes = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const list = this.clientes();
    if (!query) return list;

    return list.filter(c => 
      (c.nombre || '').toLowerCase().includes(query) ||
      (c.telefono || '').toLowerCase().includes(query) ||
      (c.direccion || '').toLowerCase().includes(query) ||
      (c.barrio || '').toLowerCase().includes(query)
    );
  });

  totalPages = computed(() => {
    const total = this.filteredClientes().length;
    const size = this.pageSize();
    return Math.ceil(total / size) || 1;
  });

  paginatedClientes = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredClientes().slice(start, end);
  });

  clienteForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    telefono: ['', [Validators.maxLength(50)]],
    direccion: ['', [Validators.maxLength(255)]],
    barrio: ['', [Validators.maxLength(100)]]
  });

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes() {
    this.loading.set(true);
    this.clientesService.getClientes().subscribe({
      next: (data) => {
        this.clientes.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error cargando clientes', err);
        this.loading.set(false);
      }
    });
  }

  onSearchChange(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  setPageSize(size: any) {
    this.pageSize.set(Number(size));
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  openModal(cliente?: Cliente) {
    if (cliente) {
      this.editingCliente.set(cliente);
      this.clienteForm.patchValue({
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        direccion: cliente.direccion,
        barrio: cliente.barrio
      });
    } else {
      this.editingCliente.set(null);
      this.clienteForm.reset();
    }
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingCliente.set(null);
    this.clienteForm.reset();
  }

  onSubmit() {
    if (this.clienteForm.invalid) return;

    const data = this.clienteForm.value;
    const current = this.editingCliente();

    if (current) {
      this.clientesService.updateCliente(current.cliente_id, data).subscribe({
        next: () => {
          this.loadClientes();
          this.closeModal();
        },
        error: (err) => console.error('Error actualizando', err)
      });
    } else {
      this.clientesService.createCliente(data).subscribe({
        next: () => {
          this.loadClientes();
          this.closeModal();
        },
        error: (err) => console.error('Error creando', err)
      });
    }
  }

  deleteCliente(id: string) {
    if (confirm('¿Está seguro de eliminar este cliente?')) {
      this.clientesService.deleteCliente(id).subscribe({
        next: () => this.loadClientes(),
        error: (err) => console.error('Error eliminando', err)
      });
    }
  }
}
export default AdminClientesPageComponent;
