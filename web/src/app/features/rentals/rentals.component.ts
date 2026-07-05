import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Room, RoomsService } from '../../core/services/rooms.service';
import { ClassesService } from '../../core/services/classes.service';

@Component({
  selector: 'app-rentals',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rentals.component.html',
  styleUrl: './rentals.component.scss'
})
export class RentalsComponent implements OnInit {
  private roomsService = inject(RoomsService);
  private classesService = inject(ClassesService);
  private fb = inject(FormBuilder);

  rooms = signal<Room[]>([]);
  rentals = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  notification = signal('');

  form = this.fb.group({
    customerName: ['', Validators.required],
    customerPhone: [''],
    title: ['', Validators.required],
    roomId: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    rentalItemIds: [[] as string[]],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadData();

    this.form.get('roomId')?.valueChanges.subscribe(() => {
      this.form.patchValue({ rentalItemIds: [] });
    });
  }

  loadData(): void {
    this.loading.set(true);

    this.roomsService.getAll().subscribe({
      next: (rooms) => {
        this.rooms.set(rooms);

        this.classesService.getAll().subscribe({
          next: (items) => {
            this.rentals.set(items.filter(item => item.type === 'RENTAL'));
            this.loading.set(false);
          },
          error: (err) => {
            console.error(err);
            this.loading.set(false);
          }
        });
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  getSelectedRoom(): Room | null {
    const roomId = this.form.get('roomId')?.value;
    return this.rooms().find(room => room.id === roomId) || null;
  }

  getSelectedRentalItemIds(): string[] {
    return this.form.get('rentalItemIds')?.value || [];
  }

  isRentalItemSelected(itemId: string): boolean {
    return this.getSelectedRentalItemIds().includes(itemId);
  }

  toggleRentalItem(itemId: string, checked: boolean): void {
    const current = this.getSelectedRentalItemIds();

    const next = checked
      ? Array.from(new Set([...current, itemId]))
      : current.filter(id => id !== itemId);

    this.form.patchValue({ rentalItemIds: next });
  }

  getExtrasTotal(): number {
    const room = this.getSelectedRoom();

    if (!room) {
      return 0;
    }

    const selectedIds = this.getSelectedRentalItemIds();

    return room.items
      .filter(item => selectedIds.includes(item.id))
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
  }

  getRentalTotal(): number {
    const room = this.getSelectedRoom();

    if (!room) {
      return 0;
    }

    return Number(room.basePrice || 0) + this.getExtrasTotal();
  }

  saveRental(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.set('Completa cliente, nombre, espacio, inicio y término.');
      return;
    }

    const raw = this.form.getRawValue();
    const start = new Date(raw.startDate || '');
    const end = new Date(raw.endDate || '');

    if (end <= start) {
      this.notification.set('La fecha de término debe ser mayor a la fecha de inicio.');
      return;
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

    const payload = {
      type: 'RENTAL' as const,
      area: 'DANCE' as const,
      title: raw.title || '',
      teacherId: null,
      roomId: raw.roomId || '',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationMinutes,
      capacity: 1,
      teacherPaymentAmount: this.getRentalTotal(),
      rentalItemIds: raw.rentalItemIds || []
    };

    this.saving.set(true);
    this.notification.set('');

    this.classesService.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset({
          customerName: '',
          customerPhone: '',
          title: '',
          roomId: '',
          startDate: '',
          endDate: '',
          rentalItemIds: [],
          notes: ''
        });
        this.loadData();
        this.notification.set('Renta registrada correctamente.');
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.notification.set(err?.error?.message || 'No se pudo registrar la renta.');
      }
    });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
