import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Room,
  RoomItem,
  RoomsService
} from '../../core/services/rooms.service';

@Component({
  selector: 'app-rooms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './rooms.component.html',
  styleUrl: './rooms.component.scss'
})
export class RoomsComponent implements OnInit {
  private service = inject(RoomsService);
  private fb = inject(FormBuilder);

  rooms = signal<Room[]>([]);
  editing = signal<Room | null>(null);
  selectedRoom = signal<Room | null>(null);

  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  notification = signal('');
  formNotification = signal('');
  detailNotification = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    capacity: [1, Validators.required],
    basePrice: [0, Validators.required],
    active: [true]
  });

  itemForm = this.fb.group({
    name: ['', Validators.required],
    price: [0, Validators.required],
    active: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);

    this.service.getAll().subscribe({
      next: data => {
        this.rooms.set(data);
        this.loading.set(false);

        const selected = this.selectedRoom();
        if (selected) {
          const refreshed = data.find(room => room.id === selected.id) || null;
          this.selectedRoom.set(refreshed);
        }
      },
      error: err => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.notification.set('');
    this.formNotification.set('');
    this.detailNotification.set('');
    this.editing.set(null);
    this.form.reset({
      name: '',
      capacity: 1,
      basePrice: 0,
      active: true
    });
    this.showForm.set(true);
  }

  openEdit(item: Room): void {
    this.notification.set('');
    this.formNotification.set('');
    this.detailNotification.set('');
    this.editing.set(item);
    this.form.patchValue({
      name: item.name,
      capacity: item.capacity,
      basePrice: item.basePrice || 0,
      active: item.active
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  openDetail(item: Room): void {
    this.notification.set('');
    this.formNotification.set('');
    this.detailNotification.set('');
    this.showForm.set(false);
    this.editing.set(null);
    this.selectedRoom.set(item);
    this.itemForm.reset({
      name: '',
      price: 0,
      active: true
    });
  }

  closeDetail(): void {
    this.selectedRoom.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formNotification.set('Nombre, capacidad y precio por hora son obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();

    const payload = {
      name: raw.name || '',
      capacity: Number(raw.capacity || 1),
      basePrice: Number(raw.basePrice || 0),
      active: !!raw.active
    };

    const wasEditing = !!this.editing();
    const request = wasEditing
      ? this.service.update(this.editing()!.id, payload)
      : this.service.create(payload);

    this.saving.set(true);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.load();
        this.notification.set(
          wasEditing
            ? 'Espacio editado correctamente.'
            : 'Espacio creado correctamente.'
        );
        this.formNotification.set('');
      },
      error: err => {
        console.error(err);
        this.saving.set(false);
        this.formNotification.set(err?.error?.message || 'No se pudo guardar.');
      }
    });
  }

  remove(item: Room): void {
    if (!confirm(`¿Eliminar ${item.name}?`)) return;

    this.service.delete(item.id).subscribe({
      next: () => {
        this.load();
        this.closeDetail();
        this.notification.set('Espacio eliminado correctamente.');
      },
      error: err => {
        console.error(err);
        this.notification.set(err?.error?.message || 'No se pudo eliminar.');
      }
    });
  }

  addItem(): void {
    const room = this.selectedRoom();

    if (!room) {
      return;
    }

    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.detailNotification.set('Nombre y precio del artículo son obligatorios.');
      return;
    }

    const raw = this.itemForm.getRawValue();

    this.service.createItem(room.id, {
      name: raw.name || '',
      price: Number(raw.price || 0),
      active: !!raw.active
    }).subscribe({
      next: () => {
        this.itemForm.reset({
          name: '',
          price: 0,
          active: true
        });
        this.load();
        this.detailNotification.set('Artículo agregado correctamente.');
      },
      error: err => {
        console.error(err);
        this.detailNotification.set(err?.error?.message || 'No se pudo agregar el artículo.');
      }
    });
  }

  removeItem(item: RoomItem): void {
    if (!confirm(`¿Eliminar ${item.name}?`)) return;

    this.service.deleteItem(item.id).subscribe({
      next: () => {
        this.load();
        this.detailNotification.set('Artículo eliminado correctamente.');
      },
      error: err => {
        console.error(err);
        this.detailNotification.set(err?.error?.message || 'No se pudo eliminar el artículo.');
      }
    });
  }

  getRoomItemsTotal(room: Room): number {
    return room.items?.reduce((sum, item) => {
      return sum + Number(item.price || 0);
    }, 0) || 0;
  }
}
