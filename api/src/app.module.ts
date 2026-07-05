import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdministratorsModule } from './administrators/administrators.module';
import { StudentsModule } from './students/students.module';
import { TeachersModule } from './teachers/teachers.module';
import { PackagesModule } from './packages/packages.module';
import { ClassesModule } from './classes/classes.module';
import { PaymentsModule } from './payments/payments.module';
import { RentalsModule } from './rentals/rentals.module';
import { CoursesModule } from './courses/courses.module';
import { RoomsModule } from './rooms/rooms.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ReservationsModule } from './reservations/reservations.module';
import { AttendancesModule } from './attendances/attendances.module';
import { ExpensesModule } from './expenses/expenses.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StoreModule } from './store/store.module';
import { ReportsModule } from './reports/reports.module';
import { PosModule } from './pos/pos.module';
import { AuthModule } from './auth/auth.module';
import { FinancesModule } from './finances/finances.module';
import { TeacherPaymentsModule } from './teacher-payments/teacher-payments.module';
import { BusinessSettingsModule } from './business-settings/business-settings.module';
import { StudentContinuityModule } from './student-continuity/student-continuity.module';

@Module({
  imports: [PrismaModule, AdministratorsModule, StudentsModule, TeachersModule, PackagesModule, ClassesModule, PaymentsModule, RentalsModule, CoursesModule, RoomsModule, MembershipsModule, ReservationsModule, AttendancesModule, ExpensesModule, EventsModule, NotificationsModule,
    StoreModule, ReportsModule, PosModule, AuthModule, FinancesModule, TeacherPaymentsModule, BusinessSettingsModule, StudentContinuityModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
