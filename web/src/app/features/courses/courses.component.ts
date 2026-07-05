import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Course, CoursesService } from '../../core/services/courses.service';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './courses.component.html',
  styleUrl: './courses.component.scss'
})
export class CoursesComponent implements OnInit {
  private service = inject(CoursesService);
  private fb = inject(FormBuilder);

  courses = signal<Course[]>([]);
  editing = signal<Course | null>(null);
  loading = signal(true);
  showForm = signal(false);
  saving = signal(false);
  notification = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    active: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: data => {
        this.courses.set(data);
        this.loading.set(false);
      },
      error: err => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.editing.set(null);
    this.form.reset({ name: '', description: '', active: true });
    this.showForm.set(true);
  }

  openEdit(item: Course): void {
    this.editing.set(item);
    this.form.patchValue({
      name: item.name,
      description: item.description || '',
      active: item.active
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editing.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.set('El nombre es obligatorio.');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name || '',
      description: raw.description || null,
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
        this.notification.set(wasEditing ? 'Actividad editada correctamente.' : 'Actividad creada correctamente.');
      },
      error: err => {
        console.error(err);
        this.saving.set(false);
        this.notification.set(err?.error?.message || 'No se pudo guardar.');
      }
    });
  }

  remove(item: Course): void {
    if (!confirm(`¿Eliminar ${item.name}?`)) return;

    this.service.delete(item.id).subscribe({
      next: () => {
        this.load();
        this.notification.set('Actividad eliminada correctamente.');
      },
      error: err => {
        console.error(err);
        this.notification.set(err?.error?.message || 'No se pudo eliminar.');
      }
    });
  }
}
