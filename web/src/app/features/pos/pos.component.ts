import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  Student,
  StudentsService
} from '../../core/services/students.service';

import {
  AticoPackage,
  PackagesService
} from '../../core/services/packages.service';

import {
  StoreProduct,
  StoreService
} from '../../core/services/store.service';

import {
  AticoClass,
  ClassesService
} from '../../core/services/classes.service';

import {
  PosCheckoutResponse,
  PosService
} from '../../core/services/pos.service';

type PosTab = 'ALL' | 'ACADEMIC' | 'STORE' | 'RENTAL' | 'COURSES_EVENTS';
type PosProductKind = 'ACADEMIC' | 'INSCRIPTION' | 'RENEWAL' | 'STORE' | 'RENTAL' | 'COURSE_EVENT';
type PosProductType = 'PACKAGE' | 'PROMOTION' | 'TRIAL' | 'DAY_PASS' | 'INSCRIPTION' | 'RENEWAL' | 'STORE' | 'RENTAL' | 'COURSE_EVENT';
type PackageAreaFilter = 'DANCE' | 'MUSIC';
type PosMode = 'academic' | null;

interface PosProduct {
  id: string;
  name: string;
  type: PosProductType;
  kind: PosProductKind;
  price: number;
  credits: number;
  area?: 'DANCE' | 'MUSIC' | 'BOTH';
  requiresEnrollment?: boolean;
  includesFreeInscription?: boolean;
  active?: boolean;
  stock?: number;
  package?: AticoPackage;
  storeProduct?: StoreProduct;
  rental?: AticoClass;
}

interface ProductAvailability {
  allowed: boolean;
  reason?: string;
  warning?: boolean;
}

interface CartItem {
  product: PosProduct;
  quantity: number;
}

interface SaleSummary {
  saleId?: string;
  folio?: string;
  saleType: string;
  studentName: string;
  products: Array<{
    name: string;
    type: string;
    quantity: number;
    total: number;
  }>;
  total: number;
  soldAt: Date;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss'
})
export class PosComponent implements OnInit {
  private studentsService = inject(StudentsService);
  private packagesService = inject(PackagesService);
  private storeService = inject(StoreService);
  private classesService = inject(ClassesService);
  private posService = inject(PosService);
  private route = inject(ActivatedRoute);

  students = signal<Student[]>([]);
  academicProducts = signal<AticoPackage[]>([]);
  storeProducts = signal<StoreProduct[]>([]);
  rentalProducts = signal<AticoClass[]>([]);
  courseEventProducts = signal<AticoClass[]>([]);
  cart = signal<CartItem[]>([]);
  lastSaleSummary = signal<SaleSummary | null>(null);

  loading = signal(true);
  saving = signal(false);
  message = signal('');
  errorMessage = signal('');

  search = signal('');
  selectedStudentId = signal('');
  selectedTab = signal<PosTab>('ALL');
  packageAreaFilter = signal<PackageAreaFilter>('DANCE');
  sourceStudentId = signal<string | null>(null);
  queryArea = signal<PackageAreaFilter | null>(null);
  mode = signal<PosMode>(null);
  private processedQueryKey = '';

  tabs: Array<{ value: PosTab; label: string }> = [
    { value: 'ALL', label: 'Todo' },
    { value: 'ACADEMIC', label: 'Académico' },
    { value: 'STORE', label: 'Tienda' },
    { value: 'RENTAL', label: 'Rentas' },
    { value: 'COURSES_EVENTS', label: 'Cursos/Eventos' },
  ];

  filteredStudents = computed(() => {
    const term = this.search().toLowerCase().trim();

    if (!term) return this.students();

    return this.students().filter(student => {
      return student.name.toLowerCase().includes(term)
        || (student.phone || '').includes(term)
        || (student.email || '').toLowerCase().includes(term);
    });
  });

  products = computed<PosProduct[]>(() => {
    const inscriptionProduct: PosProduct = {
      id: 'INSCRIPTION',
      name: 'Inscripción',
      type: 'INSCRIPTION',
      kind: 'INSCRIPTION',
      price: this.getInitialInscriptionAmount(this.getSelectedStudent()),
      credits: 0,
      active: true,
    };

    const renewalProduct: PosProduct = {
      id: 'RENEWAL',
      name: 'Renovación',
      type: 'RENEWAL',
      kind: 'RENEWAL',
      price: this.getSelectedStudent()?.studentContinuity?.renewalFeeAmount || 0,
      credits: 0,
      active: true,
    };

    const academic = this.academicProducts()
      .filter((product) => product.area === this.packageAreaFilter())
      .map((product) => {
      const type = (product.type || 'PACKAGE') as PosProductType;

      return {
        id: product.id,
        name: product.name,
        type,
        kind: 'ACADEMIC' as PosProductKind,
        price: Number(product.price || 0),
        credits: Number(product.credits || 0),
        area: product.area,
        requiresEnrollment: product.requiresEnrollment,
        includesFreeInscription: product.includesFreeInscription,
        active: (product as any).active ?? true,
        package: product,
      };
    });

    const store = this.storeProducts().map((product) => {
      return {
        id: product.id,
        name: product.name,
        type: 'STORE' as PosProductType,
        kind: 'STORE' as PosProductKind,
        price: Number(product.salePrice || 0),
        credits: 0,
        active: product.active,
        stock: product.stock,
        storeProduct: product,
      };
    });

    const rentals = this.rentalProducts().map((rental) => {
      return {
        id: rental.id,
        name: rental.title || 'Renta de espacio',
        type: 'RENTAL' as PosProductType,
        kind: 'RENTAL' as PosProductKind,
        price: Number(rental.teacherPaymentAmount || 0),
        credits: 0,
        active: true,
        rental,
      };
    });

    const courseEvents = this.courseEventProducts().map((item) => {
      return {
        id: item.id,
        name: item.title || 'Curso / Evento',
        type: 'COURSE_EVENT' as PosProductType,
        kind: 'COURSE_EVENT' as PosProductKind,
        price: Number(item.teacherPaymentAmount || 0),
        credits: 0,
        active: true,
        rental: item,
      };
    });

    return [
      inscriptionProduct,
      renewalProduct,
      ...academic,
      ...store,
      ...rentals,
      ...courseEvents,
    ];
  });

  filteredProducts = computed(() => {
    const tab = this.selectedTab();

    if (tab === 'ALL') {
      if (this.mode() === 'academic') {
        return this.products().filter((product) => product.kind !== 'STORE' && product.kind !== 'RENTAL');
      }

      return this.products();
    }

    if (tab === 'ACADEMIC') {
      return this.products().filter((product) => {
        return product.kind === 'ACADEMIC' ||
          product.kind === 'INSCRIPTION' ||
          product.kind === 'RENEWAL';
      });
    }

    if (tab === 'COURSES_EVENTS') {
      return this.products().filter((product) => product.kind === 'COURSE_EVENT');
    }

    return this.products().filter((product) => product.kind === tab);
  });

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(() => {
      this.applyQueryContext();

      if (this.students().length > 0) {
        this.selectedStudentId.set('');
        this.selectStudentFromQuery(this.students());
        this.applyQueryPreselection();
      }
    });

    this.loadAll();
  }

  private applyQueryContext(): void {
    const params = this.route.snapshot.queryParamMap;
    const mode = params.get('mode');
    const area = params.get('area');

    this.sourceStudentId.set(params.get('studentId'));

    if (mode === 'academic') {
      this.mode.set('academic');
      this.selectedTab.set('ALL');
    }

    if (area === 'DANCE' || area === 'MUSIC') {
      this.queryArea.set(area);
      this.packageAreaFilter.set(area);
    } else {
      this.queryArea.set(null);
    }
  }

  private applyQueryPreselection(): void {
    const params = this.route.snapshot.queryParamMap;
    const type = params.get('type');
    const id = params.get('id');
    const quantity = Math.max(1, Number(params.get('quantity') || 1));
    const key = `${type || ''}:${id || ''}:${params.get('studentId') || ''}:${quantity}`;

    if (!type || this.processedQueryKey === key) {
      return;
    }

    if (type === 'ENROLLMENT') {
      const product = this.products().find((item) => item.type === 'INSCRIPTION');
      this.selectedTab.set('ACADEMIC');

      if (!this.getSelectedStudent()) {
        this.message.set('Selecciona alumno para cobrar inscripción en Caja.');
        return;
      }

      if (product) {
        this.addToCart(product);
        this.processedQueryKey = key;
      }
      return;
    }

    const product = this.findProductFromQuery(type, id);

    if (!product) {
      return;
    }

    if (product.kind === 'ACADEMIC' && !this.getSelectedStudent()) {
      this.selectedTab.set('ACADEMIC');
      this.message.set('Producto preseleccionado. Selecciona alumno para agregarlo al carrito.');
      return;
    }

    if (product.kind === 'STORE') {
      this.selectedTab.set('STORE');
      this.cart.set([
        ...this.cart().filter((item) => item.product.id !== product.id),
        { product, quantity: Math.min(quantity, product.stock || quantity) },
      ]);
      this.message.set(`${product.name} enviado a Caja.`);
      this.processedQueryKey = key;
      return;
    }

    if (product.kind === 'RENTAL') {
      this.selectedTab.set('RENTAL');
    }

    if (product.kind === 'COURSE_EVENT') {
      this.selectedTab.set('COURSES_EVENTS');
    }

    this.addToCart(product);
    this.processedQueryKey = key;
  }

  private findProductFromQuery(type: string, id: string | null): PosProduct | null {
    if (!id) {
      return null;
    }

    if (type === 'PACKAGE') {
      return this.products().find((item) => item.kind === 'ACADEMIC' && item.id === id) || null;
    }

    if (type === 'STORE_PRODUCT') {
      return this.products().find((item) => item.kind === 'STORE' && item.id === id) || null;
    }

    if (type === 'RENTAL') {
      return this.products().find((item) => item.kind === 'RENTAL' && item.id === id) || null;
    }

    if (type === 'COURSE_EVENT') {
      return this.products().find((item) => item.kind === 'COURSE_EVENT' && item.id === id) || null;
    }

    return null;
  }

  loadAll(): void {
    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    Promise.all([
      firstValueFrom(this.studentsService.getAll()),
      firstValueFrom(this.packagesService.getAll()),
      firstValueFrom(this.storeService.getProducts()).catch(() => [] as StoreProduct[]),
      firstValueFrom(this.classesService.getAll()).catch(() => [] as AticoClass[]),
    ]).then(([students, products, storeProducts, classes]) => {
      this.students.set(students);
      this.academicProducts.set(products);
      this.storeProducts.set(storeProducts);
      this.rentalProducts.set(classes.filter((item) => item.type === 'RENTAL'));
      this.courseEventProducts.set(classes.filter((item) => {
        return item.type === 'COURSE' || item.type === 'WORKSHOP' || item.type === 'EVENT';
      }));
      this.selectStudentFromQuery(students);
      this.applyQueryPreselection();
      this.refreshSelectedStudent(students);
      this.loading.set(false);
    }).catch((err) => {
      console.error(err);
      this.errorMessage.set('No se pudo cargar la información de caja.');
      this.loading.set(false);
    });
  }

  selectStudent(student: Student): void {
    this.selectedStudentId.set(student.id);
    if (!this.queryArea()) {
      this.syncPackageAreaFilterForStudent(student);
    }
    this.cart.set([]);
    this.lastSaleSummary.set(null);
    this.message.set('');
    this.errorMessage.set('');
    this.applyQueryPreselection();
  }

  changeStudent(): void {
    this.selectedStudentId.set('');
    this.search.set('');
    this.cart.set([]);
    this.lastSaleSummary.set(null);
    this.message.set('');
    this.errorMessage.set('');
  }

  refreshSelectedStudent(students: Student[]): void {
    const selectedId = this.selectedStudentId();

    if (!selectedId) return;

    if (!students.some((student) => student.id === selectedId)) {
      this.selectedStudentId.set('');
      this.cart.set([]);
    }
  }

  private selectStudentFromQuery(students: Student[]): void {
    const studentId = this.sourceStudentId();

    if (!studentId || this.selectedStudentId()) {
      return;
    }

    const student = students.find((item) => item.id === studentId);

    if (!student) {
      return;
    }

    this.selectedStudentId.set(student.id);
    if (!this.queryArea()) {
      this.syncPackageAreaFilterForStudent(student);
    }
    this.search.set(student.name);
    this.message.set('Alumno preseleccionado desde expediente.');
  }

  getSelectedStudent(): Student | null {
    return this.students().find(student => student.id === this.selectedStudentId()) || null;
  }

  getStudentAvailableCredits(student: Student | null): number {
    if (!student) return 0;

    return student.memberships?.reduce((total, membership) => {
      if (membership.status && membership.status !== 'ACTIVE') {
        return total;
      }

      return total + Number(membership.availableCredits || 0);
    }, 0) || 0;
  }

  isStudentEnrolled(student: Student | null): boolean {
    return !!student?.enrolled;
  }

  hasUsedTrialClass(student: Student | null): boolean {
    return !!student?.trialClassUsed;
  }

  hasActiveMembershipCredits(student: Student | null): boolean {
    return this.getStudentAvailableCredits(student) > 0;
  }

  hasActiveMembershipCreditsForArea(student: Student | null, area?: string): boolean {
    if (!student || (area !== 'DANCE' && area !== 'MUSIC')) {
      return false;
    }

    const now = Date.now();

    return student.memberships?.some((membership: any) => {
      const expirationDate = membership.expirationDate
        ? new Date(membership.expirationDate).getTime()
        : 0;

      return membership.status === 'ACTIVE'
        && Number(membership.availableCredits || 0) > 0
        && expirationDate >= now
        && membership.package?.area === area;
    }) || false;
  }

  hasActiveMembership(area: 'DANCE' | 'MUSIC'): boolean {
    const student = this.getSelectedStudent();

    if (!student) {
      return false;
    }

    const now = Date.now();

    return student.memberships?.some((membership: any) => {
      const expirationDate = membership.expirationDate
        ? new Date(membership.expirationDate).getTime()
        : 0;

      return membership.status === 'ACTIVE'
        && expirationDate >= now
        && membership.package?.area === area;
    }) || false;
  }

  getActiveMembershipLabel(area: 'DANCE' | 'MUSIC'): string {
    return this.getActiveMembershipSummary(area);
  }

  getActiveMembershipCountByArea(area: 'DANCE' | 'MUSIC'): number {
    const student = this.getSelectedStudent();

    if (!student) {
      return 0;
    }

    const now = Date.now();
    return student.memberships
      ?.filter((membership: any) => {
        const expirationDate = membership.expirationDate
          ? new Date(membership.expirationDate).getTime()
          : 0;

        return membership.status === 'ACTIVE'
          && expirationDate >= now
          && membership.package?.area === area;
      }).length || 0;
  }

  getActiveMembershipSummary(area: 'DANCE' | 'MUSIC'): string {
    const student = this.getSelectedStudent();

    if (!student) {
      return '';
    }

    const now = Date.now();
    const memberships = student.memberships
      ?.filter((item: any) => {
        const expirationDate = item.expirationDate
          ? new Date(item.expirationDate).getTime()
          : 0;

        return item.status === 'ACTIVE'
          && expirationDate >= now
          && item.package?.area === area;
      }) || [];

    const membership = [...memberships]
      .sort((a: any, b: any) => {
        return new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime();
      })[0];

    if (!membership) {
      return '';
    }

    return `${memberships.length} paquete(s) activo(s). Próximo: ${membership.package?.name || 'Paquete'} vence ${this.formatDate(membership.expirationDate)}`;
  }

  canBuyProduct(product: PosProduct, student: Student | null): ProductAvailability {
    if (product.active === false) {
      return { allowed: false, reason: 'Producto inactivo' };
    }

    if (product.kind === 'STORE') {
      if ((product.stock || 0) <= 0) {
        return { allowed: false, reason: 'Sin inventario disponible' };
      }

      return { allowed: true };
    }

    if (product.kind === 'RENTAL') {
      if (product.price <= 0) {
        return { allowed: false, reason: 'Renta sin monto válido' };
      }

      return { allowed: true };
    }

    if (product.kind === 'COURSE_EVENT') {
      if (product.price <= 0) {
        return { allowed: false, reason: 'Sin monto configurado' };
      }

      return { allowed: true };
    }

    if (!student) {
      return { allowed: false, reason: 'Selecciona un alumno' };
    }

    if (product.kind === 'ACADEMIC' && product.area !== 'DANCE' && product.area !== 'MUSIC') {
      return { allowed: false, reason: 'Área no definida' };
    }

    if (product.kind === 'INSCRIPTION') {
      if (!student.studentContinuity?.requiresInitialInscription) {
        return { allowed: false, reason: this.getContinuityReason(student) };
      }

      return { allowed: true };
    }

    if (product.kind === 'RENEWAL') {
      if (!student.studentContinuity?.requiresRenewal) {
        return { allowed: false, reason: this.getContinuityReason(student) };
      }

      return { allowed: true };
    }

    if (product.type === 'TRIAL') {
      if (student.trialClassUsed) {
        return { allowed: false, reason: 'Clase muestra ya utilizada' };
      }

      return { allowed: true };
    }

    if (product.type === 'DAY_PASS') {
      return this.getAdditionalPackageAvailability(product);
    }

    if (
      product.type === 'PACKAGE' &&
      product.requiresEnrollment &&
      student.studentContinuity?.requiresInitialInscription
    ) {
      return { allowed: false, reason: 'Requiere inscripción' };
    }

    if (
      product.type === 'PACKAGE' &&
      product.requiresEnrollment &&
      student.studentContinuity?.requiresRenewal &&
      !this.cartHasRenewal()
    ) {
      return { allowed: false, reason: 'Requiere renovación' };
    }

    if (
      product.type === 'PROMOTION' &&
      product.requiresEnrollment &&
      !product.includesFreeInscription &&
      student.studentContinuity?.requiresInitialInscription
    ) {
      return { allowed: false, reason: 'Requiere inscripción' };
    }

    if (
      product.type === 'PROMOTION' &&
      product.requiresEnrollment &&
      !product.includesFreeInscription &&
      student.studentContinuity?.requiresRenewal &&
      !this.cartHasRenewal()
    ) {
      return { allowed: false, reason: 'Requiere renovación' };
    }

    return this.getAdditionalPackageAvailability(product);
  }

  addToCart(product: PosProduct): void {
    const student = this.getSelectedStudent();
    const availability = this.canBuyProduct(product, student);

    if (!availability.allowed) {
      this.errorMessage.set(`Producto no disponible: ${availability.reason}`);
      return;
    }

    const existing = this.cart().find(item => item.product.id === product.id);

    if (existing) {
      if (product.kind !== 'STORE') {
        this.errorMessage.set('Este producto académico ya está en el carrito.');
        return;
      }

      this.cart.set(this.cart().map((item) => {
        if (item.product.id !== product.id) {
          return item;
        }

        const nextQuantity = item.quantity + 1;

        return {
          ...item,
          quantity: Math.min(nextQuantity, item.product.stock || nextQuantity),
        };
      }));
      return;
    }

    if (product.kind === 'ACADEMIC') {
      const availabilityMessage = availability.warning ? availability.reason : '';
      this.message.set(availabilityMessage || '');
    }

    this.cart.set([...this.cart(), { product, quantity: 1 }]);
    this.lastSaleSummary.set(null);
    this.errorMessage.set('');
  }

  incrementQuantity(productId: string): void {
    this.cart.set(this.cart().map((item) => {
      if (item.product.id !== productId || item.product.kind !== 'STORE') {
        return item;
      }

      return {
        ...item,
        quantity: Math.min(item.quantity + 1, item.product.stock || item.quantity + 1),
      };
    }));
  }

  decrementQuantity(productId: string): void {
    this.cart.set(this.cart().map((item) => {
      if (item.product.id !== productId || item.product.kind !== 'STORE') {
        return item;
      }

      return {
        ...item,
        quantity: Math.max(item.quantity - 1, 1),
      };
    }));
  }

  removeFromCart(productId: string): void {
    this.cart.set(this.cart().filter(item => item.product.id !== productId));
  }

  clearCart(clearMessages = true): void {
    this.cart.set([]);

    if (clearMessages) {
      this.lastSaleSummary.set(null);
      this.message.set('');
      this.errorMessage.set('');
    }
  }

  getCartSubtotal(): number {
    return this.cart().reduce((sum, item) => {
      return sum + Number(item.product.price || 0) * item.quantity;
    }, 0);
  }

  getCartTotal(): number {
    return this.getCartSubtotal();
  }

  getSelectedStudentCreditsByArea(area: 'DANCE' | 'MUSIC'): number {
    const student = this.getSelectedStudent();

    if (!student) {
      return 0;
    }

    const now = Date.now();

    return student.memberships?.reduce((total, membership: any) => {
      const expirationDate = membership.expirationDate
        ? new Date(membership.expirationDate).getTime()
        : 0;

      if (
        membership.status !== 'ACTIVE' ||
        expirationDate < now ||
        membership.package?.area !== area
      ) {
        return total;
      }

      return total + Number(membership.availableCredits || 0);
    }, 0) || 0;
  }

  cartHasAcademicItems(): boolean {
    return this.cart().some((item) => item.product.kind === 'ACADEMIC');
  }

  cartHasInscription(): boolean {
    return this.cart().some((item) => item.product.kind === 'INSCRIPTION');
  }

  cartHasRenewal(): boolean {
    return this.cart().some((item) => item.product.kind === 'RENEWAL');
  }

  cartHasStoreItems(): boolean {
    return this.cart().some((item) => item.product.kind === 'STORE');
  }

  cartHasRentalItems(): boolean {
    return this.cart().some((item) => item.product.kind === 'RENTAL');
  }

  cartHasCourseEventItems(): boolean {
    return this.cart().some((item) => item.product.kind === 'COURSE_EVENT');
  }

  cartRequiresStudent(): boolean {
    return this.cartHasAcademicItems() || this.cartHasInscription() || this.cartHasRenewal();
  }

  getSaleType(): string {
    const hasStore = this.cartHasStoreItems();
    const hasAcademic = this.cartHasAcademicItems() ||
      this.cartHasInscription() ||
      this.cartHasRenewal() ||
      this.cartHasRentalItems() ||
      this.cartHasCourseEventItems();

    if (hasStore && hasAcademic) return 'Mixta';
    if (hasStore) return 'Tienda';
    return 'Académica';
  }

  getCheckoutBlockReason(): string | null {
    if (this.cart().length === 0) {
      return 'Agrega productos al carrito.';
    }

    if (this.cartRequiresStudent() && !this.getSelectedStudent()) {
      return 'Selecciona un alumno para vender productos académicos.';
    }

    const storeWithoutStock = this.cart().some((item) => {
      return item.product.kind === 'STORE' && item.quantity > Number(item.product.stock || 0);
    });

    if (storeWithoutStock) {
      return 'Hay productos de tienda sin stock suficiente.';
    }

    return null;
  }

  canCheckout(): boolean {
    return this.getCheckoutBlockReason() === null;
  }

  async checkout(): Promise<void> {
    const student = this.getSelectedStudent();
    const checkoutBlockReason = this.getCheckoutBlockReason();

    if (checkoutBlockReason) {
      this.errorMessage.set(checkoutBlockReason);
      return;
    }

    const items = [...this.cart()];

    const blockedItem = items.find((item) => {
      return !this.canBuyProduct(item.product, student).allowed;
    });

    if (blockedItem) {
      const availability = this.canBuyProduct(blockedItem.product, student);
      this.errorMessage.set(`Producto no disponible: ${availability.reason}`);
      return;
    }

    this.saving.set(true);
    this.message.set('');
    this.errorMessage.set('');

    try {
      const response = await firstValueFrom(this.posService.checkout({
        studentId: student?.id,
        items: this.buildCheckoutItems(items),
      }));

      this.lastSaleSummary.set(this.buildSaleSummaryFromCheckout(response));
      this.message.set(response.message || 'Venta registrada correctamente.');
      this.clearCart(false);
      await this.reloadAfterCheckout(response.student?.id || student?.id || null);
    } catch (err: any) {
      console.error(err);
      const partialMessage = 'No se pudo finalizar la venta. No se aplicaron operaciones parciales.';

      this.errorMessage.set(this.getApiErrorMessage(err, partialMessage));
    } finally {
      this.saving.set(false);
    }
  }

  buildCheckoutItems(items: CartItem[]) {
    return items.map((item) => {
      if (item.product.kind === 'ACADEMIC') {
        return {
          type: 'ACADEMIC' as const,
          packageId: item.product.package?.id || item.product.id,
        };
      }

      if (item.product.kind === 'INSCRIPTION') {
        return {
          type: 'INSCRIPTION' as const,
        };
      }

      if (item.product.kind === 'RENEWAL') {
        return {
          type: 'RENEWAL' as const,
        };
      }

      if (item.product.kind === 'RENTAL') {
        return {
          type: 'RENTAL' as const,
          rentalId: item.product.rental?.id || item.product.id,
        };
      }

      if (item.product.kind === 'COURSE_EVENT') {
        return {
          type: 'COURSE_EVENT' as const,
          courseEventId: item.product.rental?.id || item.product.id,
        };
      }

      return {
        type: 'STORE' as const,
        productId: item.product.storeProduct?.id || item.product.id,
        quantity: item.quantity,
      };
    });
  }

  buildSaleSummary(items: CartItem[], student: Student | null): SaleSummary {
    const hasStore = items.some((item) => item.product.kind === 'STORE');
    const hasAcademic = items.some((item) => item.product.kind !== 'STORE');
    const saleType = hasStore && hasAcademic
      ? 'Mixta'
      : hasStore
        ? 'Tienda'
        : 'Académica';

    return {
      saleType,
      studentName: student?.name || 'Venta anónima',
      products: items.map((item) => ({
        name: item.product.name,
        type: this.getProductTypeLabel(item.product),
        quantity: item.quantity,
        total: item.product.price * item.quantity,
      })),
      total: items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
      soldAt: new Date(),
    };
  }

  buildSaleSummaryFromCheckout(response: PosCheckoutResponse): SaleSummary {
    return {
      saleId: response.sale?.id,
      folio: response.sale?.folio || response.sale?.id,
      saleType: this.getResponseSaleTypeLabel(response.saleType),
      studentName: response.student?.name || 'Venta anónima',
      products: response.items.map((item) => ({
        name: item.name,
        type: this.getResponseItemTypeLabel(item.type),
        quantity: item.quantity,
        total: Number(item.total || 0),
      })),
      total: Number(response.total || 0),
      soldAt: new Date(),
    };
  }

  getResponseSaleTypeLabel(type: PosCheckoutResponse['saleType']): string {
    if (type === 'MIXED') return 'Mixta';
    if (type === 'STORE') return 'Tienda';
    return 'Académica';
  }

  getResponseItemTypeLabel(type: PosCheckoutResponse['items'][number]['type']): string {
    if (type === 'STORE') return 'Tienda';
    if (type === 'RENTAL') return 'Renta';
    if (type === 'COURSE_EVENT') return 'Curso/Evento';
    if (type === 'RENEWAL') return 'Renovación';
    if (type === 'INSCRIPTION') return 'Inscripción';
    return 'Académica';
  }

  startNewSale(): void {
    this.clearCart(false);
    this.lastSaleSummary.set(null);
    this.message.set('');
    this.errorMessage.set('');
  }

  async reloadAfterCheckout(studentId: string | null): Promise<void> {
    const [students, products, storeProducts, classes] = await Promise.all([
      firstValueFrom(this.studentsService.getAll()),
      firstValueFrom(this.packagesService.getAll()),
      firstValueFrom(this.storeService.getProducts()).catch(() => [] as StoreProduct[]),
      firstValueFrom(this.classesService.getAll()).catch(() => [] as AticoClass[]),
    ]);

    this.students.set(students);
    this.academicProducts.set(products);
    this.storeProducts.set(storeProducts);
    this.rentalProducts.set(classes.filter((item) => item.type === 'RENTAL'));
    this.courseEventProducts.set(classes.filter((item) => {
      return item.type === 'COURSE' || item.type === 'WORKSHOP' || item.type === 'EVENT';
    }));

    if (studentId) {
      this.selectedStudentId.set(studentId);
    }
  }

  getAreaLabel(areaOrStudent: Student | PosProduct | null): string {
    const area = areaOrStudent && 'academicArea' in areaOrStudent
      ? areaOrStudent.academicArea
      : areaOrStudent?.area;

    if (area === 'MUSIC') return 'Música';
    if (area === 'DANCE') return 'Danza';
    return 'Área no definida';
  }

  getAreaText(area: 'DANCE' | 'MUSIC'): string {
    return area === 'MUSIC' ? 'Música' : 'Danza';
  }

  setPackageAreaFilter(area: PackageAreaFilter): void {
    this.packageAreaFilter.set(area);
  }

  getDuplicateMembershipMessage(area: 'DANCE' | 'MUSIC'): string {
    return `El alumno ya tiene paquetes activos de ${this.getAreaText(area)}. Este paquete se agregará como adicional.`;
  }

  private getAdditionalPackageAvailability(product: PosProduct): ProductAvailability {
    if ((product.area === 'DANCE' || product.area === 'MUSIC') && this.hasActiveMembership(product.area)) {
      return {
        allowed: true,
        reason: this.getDuplicateMembershipMessage(product.area),
        warning: true,
      };
    }

    return { allowed: true };
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'sin fecha';
    }

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getPackageAreaCount(area: PackageAreaFilter): number {
    return this.academicProducts().filter((item) => item.area === area).length;
  }

  getPackageAreaClass(area?: string): string {
    if (area === 'MUSIC') return 'music';
    if (area === 'DANCE') return 'dance';
    return 'unknown';
  }

  getProductTypeLabel(product: PosProduct): string {
    if (product.type === 'PROMOTION') return 'Promoción';
    if (product.type === 'TRIAL') return 'Clase muestra';
    if (product.type === 'DAY_PASS') return 'Day Pass';
    if (product.type === 'RENEWAL') return 'Renovación';
    if (product.type === 'INSCRIPTION') return 'Inscripción';
    if (product.type === 'STORE') return 'Tienda';
    if (product.type === 'RENTAL') return 'Renta';
    if (product.type === 'COURSE_EVENT') return 'Curso/Evento';
    return 'Paquete';
  }

  getProductTypeClass(product: PosProduct): string {
    return product.type.toLowerCase().replace('_', '-');
  }

  getSelectedStudentStatusLabel(): string {
    const student = this.getSelectedStudent();

    if (!student) return 'Sin alumno';
    const status = student.studentContinuity?.continuityStatus;

    if (status === 'ACTIVE') return 'Activo';
    if (status === 'GRACE_PERIOD') return 'En gracia';
    if (status === 'EXPIRED_NEEDS_RENEWAL') return 'Requiere renovación';
    if (status === 'NEW_NEEDS_INSCRIPTION') return 'Requiere inscripción';

    return student.enrolled ? 'Inscrito' : 'No inscrito';
  }

  getCartItemLabel(item: CartItem): string {
    if (item.product.kind === 'STORE') {
      return `${this.getProductTypeLabel(item.product)} · ${item.quantity} pza.`;
    }

    return this.getProductTypeLabel(item.product);
  }

  getContinuityReason(student: Student | null): string {
    const continuity = student?.studentContinuity;

    if (!continuity) {
      return 'Estado de continuidad no disponible';
    }

    if (continuity.continuityStatus === 'ACTIVE') {
      return 'Continuidad activa';
    }

    if (continuity.continuityStatus === 'GRACE_PERIOD') {
      return `En periodo de gracia hasta ${this.formatDate(continuity.graceUntil)}`;
    }

    if (continuity.requiresRenewal) {
      return 'Debe pagar renovación';
    }

    if (continuity.requiresInitialInscription) {
      return 'Debe pagar inscripción inicial';
    }

    return continuity.reason || 'Continuidad revisada';
  }

  private getInitialInscriptionAmount(student: Student | null): number {
    if (!student) {
      return 0;
    }

    if (student.academicArea === 'MUSIC') {
      return 250;
    }

    if (student.academicArea === 'BOTH') {
      return 450;
    }

    return 200;
  }

  private syncPackageAreaFilterForStudent(student: Student): void {
    if (student.academicArea === 'MUSIC') {
      this.packageAreaFilter.set('MUSIC');
      return;
    }

    this.packageAreaFilter.set('DANCE');
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return message || fallback;
  }
}
