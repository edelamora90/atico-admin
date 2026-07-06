import { Test, TestingModule } from '@nestjs/testing';
import { AttendancesService } from '../attendances/attendances.service';
import { TeacherPaymentsService } from './teacher-payments.service';

describe('TeacherPaymentsService', () => {
  let service: TeacherPaymentsService;
  const attendancesServiceMock = {
    getNormalizedAttendances: jest.fn(),
  };

  beforeEach(async () => {
    attendancesServiceMock.getNormalizedAttendances.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherPaymentsService,
        {
          provide: AttendancesService,
          useValue: attendancesServiceMock,
        },
      ],
    }).compile();

    service = module.get<TeacherPaymentsService>(TeacherPaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate totals by distinct sessions, not legacy class identifiers', async () => {
    attendancesServiceMock.getNormalizedAttendances.mockResolvedValue([
      {
        id: 'reservation-1',
        source: 'RESERVATION',
        status: 'ATTENDED',
        date: '2030-01-01T10:00:00.000Z',
        sessionId: 'session-1',
        teacherId: 'teacher-1',
        teacherName: 'Docente QA',
        className: 'Salsa',
        area: 'DANCE',
        studentId: 'student-1',
        studentName: 'Alumno Uno',
        packageName: 'Danza 4',
        packageArea: 'DANCE',
        teacherPayment: 50,
      },
      {
        id: 'attendance-2',
        source: 'ATTENDANCE',
        status: 'PRESENT',
        date: '2030-01-01T10:00:00.000Z',
        sessionId: 'session-1',
        teacherId: 'teacher-1',
        teacherName: 'Docente QA',
        className: 'Salsa',
        area: 'DANCE',
        studentId: 'student-2',
        studentName: 'Alumno Dos',
        packageName: 'Danza 4',
        packageArea: 'DANCE',
        teacherPayment: 50,
      },
    ]);

    const result = await service.getSummary({ period: 'all' });

    expect(result.totals.sessionsCount).toBe(1);
    expect(result.totals.classesCount).toBe(1);
    expect(result.totals.teacherPaymentTotal).toBe(100);
    expect(JSON.stringify(result)).not.toContain(['class', 'Id'].join(''));
  });
});
