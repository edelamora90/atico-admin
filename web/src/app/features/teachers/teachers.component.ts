import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Teacher,
  TeachersService
} from '../../core/services/teachers.service';

@Component({
  selector: 'app-teachers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './teachers.component.html',
  styleUrl: './teachers.component.scss'
})
export class TeachersComponent implements OnInit {

  private teachersService = inject(TeachersService);
  private fb = inject(FormBuilder);

  teachers = signal<Teacher[]>([]);
  selectedTeacher = signal<Teacher | null>(null);
  editingTeacher = signal<Teacher | null>(null);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  notification = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    email: [''],
    phone: [''],
    active: [true]
  });

  ngOnInit(): void {
    this.loadTeachers();
  }

  loadTeachers(): void {
    this.loading.set(true);

    this.teachersService
      .getAll()
      .subscribe({
        next: (data) => {
          this.teachers.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.loading.set(false);
        }
      });
  }

  openCreate(): void {
    this.editingTeacher.set(null);
    this.form.reset({
      name: '',
      email: '',
      phone: '',
      active: true
    });
    this.showForm.set(true);
  }

  openEdit(teacher: Teacher): void {
    this.editingTeacher.set(teacher);
    this.form.patchValue({
      name: teacher.name,
      email: teacher.email || '',
      phone: teacher.phone || '',
      active: teacher.active
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTeacher.set(null);
  }

  openDetail(teacher: Teacher): void {
    this.selectedTeacher.set(teacher);
  }

  closeDetail(): void {
    this.selectedTeacher.set(null);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.set('El nombre del docente es obligatorio.');
      return;
    }

    const raw = this.form.getRawValue();

    const payload = {
      name: raw.name || '',
      email: raw.email || null,
      phone: raw.phone || null,
      active: !!raw.active
    };

    this.saving.set(true);
    this.notification.set('');

    const request = this.editingTeacher()
      ? this.teachersService.update(this.editingTeacher()!.id, payload)
      : this.teachersService.create(payload);

    request.subscribe({
      next: () => {
        const wasEditing = !!this.editingTeacher();

        this.saving.set(false);
        this.closeForm();
        this.loadTeachers();

        this.notification.set(
          wasEditing
            ? 'Docente editado correctamente.'
            : 'Docente creado correctamente.'
        );
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.notification.set(
          err?.error?.message || 'No se pudo guardar el docente.'
        );
      }
    });
  }

  deleteTeacher(teacher: Teacher): void {
    const confirmed = confirm(
      `¿Eliminar al docente ${teacher.name}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) {
      return;
    }

    this.teachersService
      .delete(teacher.id)
      .subscribe({
        next: () => {
          this.closeDetail();
          this.loadTeachers();
          this.notification.set('Docente eliminado correctamente.');
        },
        error: (err) => {
          console.error(err);
          this.notification.set(
            err?.error?.message || 'No se pudo eliminar el docente.'
          );
        }
      });
  }

  getActiveCount(): number {
    return this.teachers().filter(t => t.active).length;
  }

  getTotalClasses(teacher: Teacher): number {
    return teacher.classes?.length || 0;
  }

}
