import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CreateStudentPayload,
  StudentsService
} from '../../core/services/students.service';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './student-form.component.html',
  styleUrl: './student-form.component.scss'
})
export class StudentFormComponent implements OnInit {

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentsService = inject(StudentsService);

  studentId = signal<string | null>(null);
  loading = signal(false);
  saving = signal(false);
  alert = signal<UiAlert | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    email: [''],
    phone: ['', Validators.required],

    birthDate: [''],
    bloodType: [''],
    allergies: [''],
    medicalConditions: [''],
    medications: [''],
    injuries: [''],
    medicalNotes: [''],

    emergencyContactName: [''],
    emergencyContactRelationship: [''],
    emergencyContactPhone: [''],
    emergencyContactPhone2: [''],

    academicArea: ['DANCE'],
    photoConsent: [false],
    mediaConsent: [false],
    rulesAccepted: [false]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (id) {
      this.studentId.set(id);
      this.loadStudent(id);
    }
  }

  loadStudent(id: string): void {
    this.loading.set(true);

    this.studentsService
      .getById(id)
      .subscribe({
        next: (student) => {
          this.form.patchValue({
            name: student.name ?? '',
            email: student.email ?? '',
            phone: student.phone ?? '',

            birthDate: student.birthDate ? student.birthDate.substring(0, 10) : '',
            bloodType: student.bloodType ?? '',
            allergies: student.allergies ?? '',
            medicalConditions: student.medicalConditions ?? '',
            medications: student.medications ?? '',
            injuries: student.injuries ?? '',
            medicalNotes: student.medicalNotes ?? '',

            emergencyContactName: student.emergencyContactName ?? '',
            emergencyContactRelationship: student.emergencyContactRelationship ?? '',
            emergencyContactPhone: student.emergencyContactPhone ?? '',
            emergencyContactPhone2: student.emergencyContactPhone2 ?? '',

            academicArea: student.academicArea ?? 'DANCE',
            photoConsent: student.photoConsent ?? false,
            mediaConsent: student.mediaConsent ?? false,
            rulesAccepted: student.rulesAccepted ?? false
          });

          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo cargar el alumno.'));
          this.loading.set(false);
        }
      });
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setAlert('warning', 'Completa los campos obligatorios marcados con *.');
      return;
    }

    const raw = this.form.getRawValue();

    const payload = this.cleanPayload({
      name: this.cleanRequiredString(raw.name),
      phone: this.cleanRequiredString(raw.phone),
      email: this.cleanOptionalString(raw.email),

      birthDate: this.cleanOptionalString(raw.birthDate),
      bloodType: this.cleanOptionalString(raw.bloodType),
      allergies: this.cleanOptionalString(raw.allergies),
      medicalConditions: this.cleanOptionalString(raw.medicalConditions),
      medications: this.cleanOptionalString(raw.medications),
      injuries: this.cleanOptionalString(raw.injuries),
      medicalNotes: this.cleanOptionalString(raw.medicalNotes),

      emergencyContactName: this.cleanOptionalString(raw.emergencyContactName),
      emergencyContactRelationship: this.cleanOptionalString(raw.emergencyContactRelationship),
      emergencyContactPhone: this.cleanOptionalString(raw.emergencyContactPhone),
      emergencyContactPhone2: this.cleanOptionalString(raw.emergencyContactPhone2),

      academicArea: (raw.academicArea || 'DANCE') as 'DANCE' | 'MUSIC' | 'BOTH',
      photoConsent: !!raw.photoConsent,
      mediaConsent: !!raw.mediaConsent,
      rulesAccepted: !!raw.rulesAccepted
    }) as CreateStudentPayload;

    this.saving.set(true);
    this.clearAlert();

    const request = this.studentId()
      ? this.studentsService.update(this.studentId()!, payload)
      : this.studentsService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/students']);
      },
      error: (err) => {
        console.error(err);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo guardar el alumno.'));
        this.saving.set(false);
      }
    });
  }

  private setAlert(type: AlertType, message: string): void {
    this.alert.set({ type, message });
  }

  private clearAlert(): void {
    this.alert.set(null);
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message
        .map((item) => this.formatApiMessage(item))
        .filter(Boolean)
        .join(' ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return `${fallback} Detalle: ${error.message}`;
    }

    return fallback;
  }

  private cleanRequiredString(value: unknown): string {
    return String(value ?? '').trim();
  }

  private cleanOptionalString(value: unknown): string | undefined {
    const text = String(value ?? '').trim();
    return text ? text : undefined;
  }

  private cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    return Object.entries(payload).reduce<Partial<T>>((cleaned, [key, value]) => {
      if (value === undefined || value === '') {
        return cleaned;
      }

      cleaned[key as keyof T] = value as T[keyof T];
      return cleaned;
    }, {});
  }

  private formatApiMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message && typeof message === 'object') {
      return Object.values(message as Record<string, unknown>)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ');
    }

    return '';
  }


  getBaseInscriptionAmount(): number {
    const area = this.form.get('academicArea')?.value;

    if (area === 'MUSIC') {
      return 250;
    }

    if (area === 'BOTH') {
      return 450;
    }

    return 200;
  }

  getAcademicAreaLabel(): string {
    const area = this.form.get('academicArea')?.value;

    if (area === 'MUSIC') {
      return 'Música';
    }

    if (area === 'BOTH') {
      return 'Danza y Música';
    }

    return 'Danza';
  }


  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

}
