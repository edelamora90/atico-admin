import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  active: boolean;
  sales: any[];
}

interface StoreDashboard {
  totalSales: number;
  totalProfit: number;
  soldUnits: number;
  productsCount: number;
  lowStockCount: number;
  lowStockProducts: StoreProduct[];
  topProducts: any[];
  recentSales: any[];
}

type AlertType = 'success' | 'error' | 'warning' | 'info';
type ProductStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'WITH_STOCK' | 'OUT_OF_STOCK' | 'LOW_STOCK';
type ProductSortField = 'name' | 'salePrice' | 'stock' | 'profit';
type SortDirection = 'asc' | 'desc';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './store.component.html',
  styleUrl: './store.component.scss'
})
export class StoreComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private api = '/api/store';

  activeTab = signal<'sales' | 'admin'>('sales');

  products = signal<StoreProduct[]>([]);
  dashboard = signal<StoreDashboard | null>(null);
  editingProduct = signal<StoreProduct | null>(null);

  loading = signal(true);
  saving = signal(false);
  alert = signal<UiAlert | null>(null);
  formAlert = signal<UiAlert | null>(null);
  productSearch = signal('');
  productStatusFilter = signal<ProductStatusFilter>('ALL');
  productSortField = signal<ProductSortField>('name');
  productSortDirection = signal<SortDirection>('asc');
  filtersOpen = signal(false);
  uploadingImage = signal(false);
  imagePreview = signal<string | null>(null);
  brokenImages = signal<Record<string, boolean>>({});
  private objectPreviewUrl: string | null = null;

  productForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    imageUrl: [''],
    salePrice: [0, Validators.required],
    costPrice: [0, Validators.required],
    stock: [0, Validators.required],
    active: [true]
  });

  quantities: Record<string, number> = {};
  cart = signal<{ product: StoreProduct; quantity: number }[]>([]);

  filteredProducts = computed(() => {
    const term = this.normalizeSearch(this.productSearch());
    const status = this.productStatusFilter();
    const sortField = this.productSortField();
    const direction = this.productSortDirection();

    return this.products()
      .filter((product) => {
        const searchable = this.normalizeSearch([
          product.name,
          product.description,
          product.id,
          product.active ? 'activo' : 'inactivo',
          product.stock <= 0 ? 'sin stock' : 'con stock',
        ].join(' '));

        if (term && !searchable.includes(term)) {
          return false;
        }

        if (status === 'ACTIVE' && !product.active) return false;
        if (status === 'INACTIVE' && product.active) return false;
        if (status === 'WITH_STOCK' && product.stock <= 0) return false;
        if (status === 'OUT_OF_STOCK' && product.stock > 0) return false;
        if (status === 'LOW_STOCK' && !(product.stock > 0 && product.stock <= 5)) return false;

        return true;
      })
      .sort((a, b) => this.compareProducts(a, b, sortField, direction));
  });

  filteredSaleProducts = computed(() => {
    return this.filteredProducts().filter((product) => product.active);
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.revokeObjectPreviewUrl();
  }

  loadData(): void {
    this.loading.set(true);

    this.http.get<StoreProduct[]>(`${this.api}/products`).subscribe({
      next: products => {
        this.products.set(products);

        for (const product of products) {
          if (!this.quantities[product.id]) {
            this.quantities[product.id] = 1;
          }
        }

        this.http.get<StoreDashboard>(`${this.api}/dashboard`).subscribe({
          next: dashboard => {
            this.dashboard.set(dashboard);
            this.loading.set(false);
          },
          error: err => {
            console.error(err);
            this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo cargar el tablero de tienda.'));
            this.loading.set(false);
          }
        });
      },
      error: err => {
        console.error(err);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudieron cargar los productos de tienda.'));
        this.loading.set(false);
      }
    });
  }

  setTab(tab: 'sales' | 'admin'): void {
    this.activeTab.set(tab);
    this.clearAlert();
    this.clearFormAlert();
  }

  getQuantity(product: StoreProduct): number {
    return this.quantities[product.id] || 1;
  }

  setQuantity(product: StoreProduct, value: number): void {
    const cleanValue = Math.max(1, Number(value || 1));
    this.quantities[product.id] = cleanValue;
  }

  increase(product: StoreProduct): void {
    const current = this.getQuantity(product);

    if (current < product.stock) {
      this.quantities[product.id] = current + 1;
    }
  }

  decrease(product: StoreProduct): void {
    const current = this.getQuantity(product);

    if (current > 1) {
      this.quantities[product.id] = current - 1;
    }
  }

  addToCart(product: StoreProduct): void {
    const quantity = this.getQuantity(product);

    if (quantity <= 0) {
      return;
    }

    const current = this.cart();
    const existing = current.find(item => item.product.id === product.id);

    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, product.stock);
      this.cart.set([...current]);
    } else {
      this.cart.set([...current, { product, quantity }]);
    }

    this.quantities[product.id] = 1;
  }

  removeFromCart(productId: string): void {
    this.cart.set(this.cart().filter(item => item.product.id !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  getCartTotal(): number {
    return this.cart().reduce((sum, item) => {
      return sum + item.product.salePrice * item.quantity;
    }, 0);
  }

  getCartProfit(): number {
    return this.cart().reduce((sum, item) => {
      return sum + (item.product.salePrice - item.product.costPrice) * item.quantity;
    }, 0);
  }

  sendProductToPos(product: StoreProduct): void {
    this.router.navigate(['/pos'], {
      queryParams: {
        type: 'STORE_PRODUCT',
        id: product.id,
        quantity: this.getQuantity(product),
      },
    });
  }

  getProductImageUrl(imageUrl?: string | null): string {
    const value = String(imageUrl || '').trim();

    if (!value) {
      return '';
    }

    if (value.startsWith('blob:') || value.startsWith('data:')) {
      return value;
    }

    if (value.startsWith('http://') || value.startsWith('https://')) {
      try {
        const url = new URL(value);

        if (url.pathname.startsWith('/uploads/')) {
          return url.pathname;
        }
      } catch {
        return value;
      }

      return value;
    }

    if (value.startsWith('/uploads/')) {
      return value;
    }

    if (value.startsWith('uploads/')) {
      return `/${value}`;
    }

    return `/uploads/products/${value}`;
  }

  hasProductImage(product: StoreProduct): boolean {
    return !!this.getProductImageUrl(product.imageUrl) && !this.brokenImages()[product.id];
  }

  onProductImageError(productId: string): void {
    this.brokenImages.update((current) => ({
      ...current,
      [productId]: true,
    }));
  }

  onPreviewImageError(): void {
    this.imagePreview.set(null);
  }


  uploadProductImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.revokeObjectPreviewUrl();
    this.objectPreviewUrl = URL.createObjectURL(file);
    this.imagePreview.set(this.objectPreviewUrl);
    const editing = this.editingProduct();

    if (editing) {
      this.clearBrokenImage(editing.id);
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploadingImage.set(true);
    this.clearAlert();

    this.http.post<{ imageUrl: string }>(`${this.api}/products/upload-image`, formData)
      .subscribe({
        next: (response) => {
          this.uploadingImage.set(false);
          const normalizedImageUrl = this.getProductImageUrl(response.imageUrl);

          this.productForm.patchValue({
            imageUrl: normalizedImageUrl
          });

          this.setAlert('success', 'Imagen subida correctamente.');
        },
        error: (err) => {
          console.error(err);
          this.uploadingImage.set(false);
          this.revokeObjectPreviewUrl();
          this.imagePreview.set(this.getProductImageUrl(this.editingProduct()?.imageUrl) || null);
          this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo subir la imagen.'));
        }
      });
  }


  saveProduct(): void {
    if (this.saving()) {
      return;
    }

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.setAlert('warning', 'Completa los datos del producto.');
      return;
    }

    const raw = this.productForm.getRawValue();

    const payload = {
      name: raw.name || '',
      description: raw.description || null,
      imageUrl: raw.imageUrl || null,
      salePrice: Number(raw.salePrice || 0),
      costPrice: Number(raw.costPrice || 0),
      stock: Number(raw.stock || 0),
      active: !!raw.active
    };

    const editing = this.editingProduct();

    this.saving.set(true);
    this.clearFormAlert();
    this.clearAlert();

    const request = editing
      ? this.http.patch(`${this.api}/products/${editing.id}`, payload)
      : this.http.post(`${this.api}/products`, payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        if (editing) {
          this.clearBrokenImage(editing.id);
        }
        this.editingProduct.set(null);
        this.productForm.reset({
          name: '',
          description: '',
          imageUrl: '',
          salePrice: 0,
          costPrice: 0,
          stock: 0,
          active: true
        });
        this.revokeObjectPreviewUrl();
        this.imagePreview.set(null);
        this.loadData();
        this.setAlert('success', editing ? 'Producto editado correctamente.' : 'Producto creado correctamente.');
      },
      error: err => {
        console.error(err);
        this.saving.set(false);
        this.setFormAlert('error', this.getApiErrorMessage(err, 'No se pudo guardar el producto.'));
      }
    });
  }

  editProduct(product: StoreProduct): void {
    this.setTab('admin');
    this.clearAlert();
    this.editingProduct.set(product);
    this.revokeObjectPreviewUrl();
    this.imagePreview.set(this.getProductImageUrl(product.imageUrl) || null);

    this.productForm.patchValue({
      name: product.name,
      description: product.description || '',
      imageUrl: this.getProductImageUrl(product.imageUrl),
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      stock: product.stock,
      active: product.active
    });
  }

  cancelEdit(): void {
    this.clearAlert();
    this.editingProduct.set(null);
    this.productForm.reset({
      name: '',
      description: '',
      imageUrl: '',
      salePrice: 0,
      costPrice: 0,
      stock: 0,
      active: true
    });
    this.revokeObjectPreviewUrl();
    this.imagePreview.set(null);
  }

  deleteProduct(product: StoreProduct): void {
    if (!confirm(`¿Desactivar ${product.name}? No se borrará el historial de ventas.`)) return;

    const reason = window.prompt('Motivo de desactivación');

    if (!reason || reason.trim().length < 3) {
      this.setAlert('warning', 'Captura un motivo de al menos 3 caracteres.');
      return;
    }

    this.clearAlert();

    this.http.delete(`${this.api}/products/${product.id}`, {
      body: { reason: reason.trim() },
    }).subscribe({
      next: () => {
        this.loadData();
        this.setAlert('success', 'Producto desactivado correctamente.');
      },
      error: err => {
        console.error(err);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo eliminar.'));
      }
    });
  }

  clearProductFilters(): void {
    this.productSearch.set('');
    this.productStatusFilter.set('ALL');
    this.productSortField.set('name');
    this.productSortDirection.set('asc');
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  setProductSort(field: ProductSortField): void {
    if (this.productSortField() === field) {
      this.productSortDirection.set(this.productSortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.productSortField.set(field);
    this.productSortDirection.set('asc');
  }

  getProductSortIcon(field: ProductSortField): string {
    if (this.productSortField() !== field) {
      return '↕';
    }

    return this.productSortDirection() === 'asc' ? '↑' : '↓';
  }

  getActiveProductFiltersCount(): number {
    return [
      this.productSearch(),
      this.productStatusFilter() !== 'ALL' ? this.productStatusFilter() : '',
    ].filter(Boolean).length;
  }

  private compareProducts(
    a: StoreProduct,
    b: StoreProduct,
    field: ProductSortField,
    direction: SortDirection,
  ): number {
    const multiplier = direction === 'asc' ? 1 : -1;
    let result = 0;

    if (field === 'salePrice') {
      result = Number(a.salePrice || 0) - Number(b.salePrice || 0);
    } else if (field === 'stock') {
      result = Number(a.stock || 0) - Number(b.stock || 0);
    } else if (field === 'profit') {
      result = this.getProductProfit(a) - this.getProductProfit(b);
    } else {
      result = String(a.name || '').localeCompare(String(b.name || ''), 'es');
    }

    return result * multiplier;
  }

  private getProductProfit(product: StoreProduct): number {
    return Number(product.salePrice || 0) - Number(product.costPrice || 0);
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private setAlert(type: AlertType, message: string): void {
    this.alert.set({ type, message });
  }

  private clearAlert(): void {
    this.alert.set(null);
  }

  private setFormAlert(type: AlertType, message: string): void {
    this.formAlert.set({ type, message });
  }

  private clearFormAlert(): void {
    this.formAlert.set(null);
  }

  private clearBrokenImage(productId: string): void {
    this.brokenImages.update((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  private revokeObjectPreviewUrl(): void {
    if (this.objectPreviewUrl) {
      URL.revokeObjectURL(this.objectPreviewUrl);
      this.objectPreviewUrl = null;
    }
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    const status = error?.status;
    const statusText = error?.statusText;
    const url = error?.url;

    if (status === 0) {
      return `${fallback} No hubo respuesta del servidor. Verifica que la API esté encendida.`;
    }

    if (status) {
      return `${fallback} Código ${status}${statusText ? `: ${statusText}` : ''}${url ? ` · ${url}` : ''}`;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return `${fallback} Detalle: ${error.message}`;
    }

    return fallback;
  }
}
