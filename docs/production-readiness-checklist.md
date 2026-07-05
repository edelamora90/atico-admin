# Checklist técnico de producción

## Variables de entorno

- [ ] `DATABASE_URL` apunta a la base productiva correcta y no a una base local o de pruebas.
- [ ] `JWT_SECRET` está definido con un secreto largo, privado y distinto al de desarrollo.
- [ ] `PORT` del API está definido y coincide con Nginx/PM2/systemd.
- [ ] `FRONTEND_URL` o URL pública permitida está definida si se habilita CORS restringido.
- [ ] No hay secretos reales versionados en el repositorio.
- [ ] Hay respaldo seguro de las variables usadas en producción.

## Base de datos

- [ ] Ejecutar migraciones con `npx prisma migrate deploy`.
- [ ] Ejecutar `npx prisma generate` después de instalar dependencias.
- [ ] Confirmar conexión con `npx prisma db pull` o una consulta de solo lectura.
- [ ] Crear respaldo antes de cualquier normalización de alumnos históricos.
- [ ] Ejecutar `npx ts-node scripts/audit-student-continuity.ts` y guardar salida.
- [ ] Ejecutar `CONFIRM_FIX_STUDENT_CONTINUITY=true npx ts-node scripts/fix-student-continuity.ts` solo después de revisar el audit.
- [ ] Repetir audit y confirmar que Finanzas no cambió después de normalizar flags.

## Seguridad

- [ ] Confirmar 401 sin token en endpoints sensibles: alumnos, finanzas, gastos, corte docente, POS/corte, configuración, reservaciones, asistencias, clases y paquetes.
- [ ] Confirmar permisos por rol:
  - [ ] `SUPER_ADMIN`: acceso administrativo completo.
  - [ ] `ADMIN`: acceso operativo-administrativo sin credenciales de superadmin.
  - [ ] `RECEPCION`: alumnos, reservaciones, asistencias/check-in, POS, corte de caja, membresías, paquetes lectura.
  - [ ] `MAESTRO`: calendario, clases, asistencias/check-in según aplique.
- [ ] Confirmar que `RECEPCION` recibe 403 en finanzas, gastos, corte docente y cambios de configuración.
- [ ] Confirmar que los módulos incompletos no aparecen en menú principal.
- [ ] Cambiar contraseñas temporales de usuarios reales.

## Frontend

- [ ] Compilar con `npm run build`.
- [ ] Verificar login, menú por rol y cierre de sesión.
- [ ] Verificar que Corte de caja separa Paquetes, Inscripción, Renovación, Tienda y Total.
- [ ] Verificar exportación CSV e impresión/Guardar como PDF de corte de caja.
- [ ] Verificar POS en escritorio/tablet usado en recepción.

## Operación académica

- [ ] Crear alumno real de prueba y vender primer paquete desde POS: debe cobrar Inscripción.
- [ ] Comprar segundo paquete del mismo área: debe acumular créditos y consumir FEFO.
- [ ] Reservar y hacer check-in: no debe descontar doble crédito.
- [ ] Cancelar reservación futura: debe devolver crédito y crear transacción `CANCELLATION`.
- [ ] Validar que la asistencia genera corte docente solo cuando aplica.
- [ ] Alumno vencido fuera de gracia: debe cobrar Renovación y no Inscripción.
- [ ] Crear gasto: debe reducir utilidad; eliminar gasto debe restaurarla.

## Deploy

- [ ] Instalar dependencias con lockfile: `npm ci` en `api/` y `web/`.
- [ ] API: `npm run build`.
- [ ] Web: `npm run build`.
- [ ] Servir `web/dist/...` desde Nginx o hosting estático.
- [ ] Ejecutar API con PM2/systemd apuntando al build de Nest.
- [ ] Configurar HTTPS antes de usar datos reales.
- [ ] Probar health/manual smoke test desde la URL pública.

## Rollback y respaldos

- [ ] Respaldar DB antes del despliegue.
- [ ] Tener identificada la versión anterior del API y frontend.
- [ ] Documentar comando de rollback del proceso (`pm2 restart`, symlink anterior o redeploy).
- [ ] Validar que el backup puede restaurarse en una base temporal.

## Logs y monitoreo

- [ ] Revisar logs de API después de login, POS, reservación, check-in y corte.
- [ ] Monitorear errores 401/403/500 durante el primer día operativo.
- [ ] Registrar folios POS usados en pruebas reales.
- [ ] Confirmar zona horaria del servidor para cortes diarios.
