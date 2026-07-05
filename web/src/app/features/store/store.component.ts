import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
export class StoreComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  private api = 'http://localhost:3004/api/store';

  activeTab = signal<'sales' | 'admin'>('sales');

  products = signal<StoreProduct[]>([]);
  dashboard = signal<StoreDashboard | null>(null);
  editingProduct = signal<StoreProduct | null>(null);

  loading = signal(true);
  saving = signal(false);
  alert = signal<UiAlert | null>(null);
  formAlert = signal<UiAlert | null>(null);
  uploadingImage = signal(false);
  imagePreview = signal<string | null>(null);

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

  ngOnInit(): void {
    this.loadData();
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

  checkout(): void {
    if (this.cart().length === 0) {
      this.setAlert('warning', 'El carrito está vacío.');
      return;
    }

    const payload = {
      items: this.cart().map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }))
    };

    this.http.post(`${this.api}/checkout`, payload).subscribe({
      next: () => {
        this.clearCart();
        this.loadData();
        this.setAlert('success', 'Venta registrada correctamente.');
      },
      error: err => {
        console.error(err);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo registrar la venta.'));
      }
    });
  }

  buyProduct(product: StoreProduct): void {
    const quantity = this.getQuantity(product);

    this.http.post(`${this.api}/sales`, {
      productId: product.id,
      quantity
    }).subscribe({
      next: () => {
        this.quantities[product.id] = 1;
        this.loadData();
        this.setAlert('success', `Venta registrada: ${product.name} x${quantity}`);
      },
      error: err => {
        console.error(err);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo registrar la venta.'));
      }
    });
  }

  getProductImage(product: StoreProduct): string {
    return product.imageUrl || 'https://placehold.co/600x400?text=Producto';
  }


  uploadProductImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    this.uploadingImage.set(true);
    this.clearAlert();

    this.http.post<{ imageUrl: string }>(`${this.api}/products/upload-image`, formData)
      .subscribe({
        next: (response) => {
          this.uploadingImage.set(false);
          this.imagePreview.set(response.imageUrl);

          this.productForm.patchValue({
            imageUrl: response.imageUrl
          });

          this.setAlert('success', 'Imagen subida correctamente.');
        },
        error: (err) => {
          console.error(err);
          this.uploadingImage.set(false);
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
    this.imagePreview.set(product.imageUrl || null);

    this.productForm.patchValue({
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
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
    this.imagePreview.set(null);
  }

  deleteProduct(product: StoreProduct): void {
    if (!confirm(`¿Eliminar ${product.name}?`)) return;

    this.clearAlert();

    this.http.delete(`${this.api}/products/${product.id}`).subscribe({
      next: () => {
        this.loadData();
        this.setAlert('success', 'Producto eliminado correctamente.');
      },
      error: err => {
        console.error(err);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo eliminar.'));
      }
    });
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
      return `${fallback} No hubo respuesta del servidor. Verifica que la API esté encendida en http://localhost:3004.`;
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
