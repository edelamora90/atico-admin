# Manual de Usuario - El Atico Admin

## Guia operativa para administracion, recepcion y control academico

**Sistema:** El Atico Admin
**Audiencia:** Direccion, administracion, recepcion, maestros y personal operativo
**Formato:** Manual operativo en Markdown, listo para convertirse a PDF o Word

---

## 1. Introduccion

El Atico Admin es la plataforma administrativa para controlar la operacion academica, comercial y financiera de El Atico.

El sistema ayuda a organizar:

- Alumnos.
- Clases, cursos, talleres y eventos.
- Sesiones reales de actividades.
- Reservaciones.
- Asistencias y check-in.
- Inscripciones.
- Paquetes y membresias.
- Caja / POS.
- Tienda e inventario.
- Rentas de salones o espacios.
- Salones, articulos y equipo.
- Finanzas, gastos, cortes y reportes.
- Usuarios, permisos, notificaciones y alertas.

La regla operativa mas importante es:

> **Si entra dinero, se cobra en Caja / POS.**

Programacion sirve para crear actividades. Paquetes sirve para configurar productos academicos. Tienda sirve para administrar inventario. Rentas sirve para preparar reservas de espacios. Finanzas sirve para consultar resultados. El cobro oficial se realiza desde Caja / POS.

---

## 2. Conceptos generales

| Concepto | Significado |
| --- | --- |
| Alumno | Persona registrada en el sistema. Puede tener datos de contacto, historial, membresias, creditos y asistencias. |
| Programacion | Modulo donde se crean clases, cursos, talleres y eventos. |
| Clase | Actividad recurrente. Puede ser indefinida o tener fecha de termino. |
| Curso | Actividad con dias y horarios definidos, normalmente con fecha de inicio y fin. |
| Taller | Actividad con dias y horarios definidos, usualmente de duracion limitada. |
| Evento | Actividad con una o varias funciones puntuales. Cada funcion tiene fecha, hora de inicio y hora de termino. |
| Sesion | Ocurrencia real de una actividad en una fecha y horario. Es lo que se reserva y se marca como asistencia. |
| Paquete | Producto academico que otorga creditos o clases disponibles. |
| Membresia | Compra de un paquete por parte de un alumno. |
| Inscripcion | Pago o registro inicial que habilita al alumno dentro del sistema. |
| Caja / POS | Lugar oficial para cobrar cualquier concepto. |
| Tienda | Modulo para administrar productos fisicos, stock, costos y precios. |
| Renta | Uso de un salon o espacio durante un periodo definido. |
| Salon / Espacio | Lugar fisico usado para clases, eventos, talleres, cursos o rentas. |
| Articulo de salon | Elemento asignado a un salon, como bocinas, sillas, mesas, espejos, proyectores o instrumentos. |
| Check-in | Proceso para confirmar asistencia a una sesion. |
| Notificacion | Aviso generado por el sistema para alertar sobre situaciones importantes. |
| Alerta | Mensaje operativo que requiere atencion, por ejemplo vencimientos, creditos bajos o pagos pendientes. |

**Nota importante:** El sistema trabaja con sesiones reales. Para el usuario, esto significa que se reserva y se toma asistencia sobre un dia y horario especifico, no solo sobre el nombre general de una clase.

---

## 3. Navegacion general

El sistema se organiza con un menu lateral izquierdo. Los modulos estan agrupados por proceso de negocio.

### Categorias principales del menu

| Categoria | Modulos |
| --- | --- |
| Inicio | Dashboard |
| Operacion academica | Calendario, Programacion, Reservaciones, Asistencias, Check-in |
| Alumnos | Alumnos, Membresias, Paquetes |
| Personal | Maestros, Pagos a maestros, Usuarios / Admin |
| Finanzas | Finanzas, Gastos, Corte de caja |
| Rentas y espacios | Rentas, Salones |
| Tienda / POS | Tienda, POS |
| Configuracion | Negocio |

### Elementos comunes

- **Botones principales:** normalmente crean, guardan o confirman una accion.
- **Filtros:** ayudan a ver informacion por periodo, estado, area o tipo.
- **Tablas:** muestran registros como alumnos, ventas, asistencias o reservaciones.
- **Tarjetas:** muestran resumenes, indicadores o elementos destacados.
- **Formularios:** se usan para capturar o editar informacion.
- **Mensajes de exito/error:** confirman si una accion se completo o si necesita correccion.
- **Modo claro / modo oscuro:** se cambia desde el boton de tema del encabezado. La preferencia se guarda automaticamente.

**Advertencia:** Si un boton indica "Cobrar en Caja" o "Enviar a Caja", significa que el cobro no se cierra en ese modulo. El cobro se completa en Caja / POS.

---

## 4. Dashboard

El Dashboard muestra una vista general del estado operativo del negocio.

Puede incluir:

- Ingresos recientes.
- Alumnos registrados o activos.
- Clases y actividades del dia.
- Asistencias.
- Alertas relevantes.
- Actividad reciente.
- Indicadores de operacion.

### Como interpretar el Dashboard

1. Revise los indicadores principales al inicio del dia.
2. Identifique alertas o actividades importantes.
3. Consulte clases o sesiones proximas.
4. Use los datos como referencia rapida; para detalle, entre al modulo correspondiente.

**Nota:** Dashboard sirve para consulta rapida. No sustituye a Finanzas, Corte de caja ni Programacion.

---

## 5. Alumnos

El modulo de Alumnos sirve para registrar, consultar y administrar la informacion de cada alumno.

### Informacion que puede registrarse

- Nombre.
- Telefono.
- Datos de contacto.
- Informacion medica si aplica.
- Contacto de emergencia.
- Estado del alumno.
- Historial de membresias.
- Creditos disponibles.
- Reservaciones y asistencias.

### Crear un alumno

1. Entrar a **Alumnos**.
2. Presionar **Nuevo alumno**.
3. Capturar datos personales.
4. Capturar telefono y datos de contacto.
5. Capturar informacion medica si aplica.
6. Capturar contacto de emergencia.
7. Guardar.

### Editar un alumno

1. Entrar a **Alumnos**.
2. Buscar al alumno.
3. Abrir su detalle o presionar editar.
4. Modificar la informacion necesaria.
5. Guardar cambios.

### Consultar el detalle de un alumno

1. Entrar a **Alumnos**.
2. Seleccionar al alumno.
3. Revisar su informacion general.
4. Revisar membresias, creditos, asistencias y reservaciones.

### Revisar creditos disponibles

1. Abrir el detalle del alumno.
2. Buscar la seccion de membresias o creditos.
3. Revisar creditos disponibles por area, por ejemplo danza o musica.

### Revisar vencimientos

1. Entrar al detalle del alumno.
2. Revisar membresias activas.
3. Verificar fecha de compra, vigencia y estado.

**Advertencia:** Antes de vender un paquete, confirme que el alumno este registrado correctamente. Esto ayuda a que los creditos queden asignados al alumno correcto.

---

## 6. Programacion academica

Programacion es el modulo correcto para crear:

- Clase.
- Curso.
- Taller.
- Evento.

Este modulo sirve para programar actividades. Aqui no se cobra.

### 6.1 Crear una clase

1. Entrar a **Programacion**.
2. Presionar **Programar actividad**.
3. Seleccionar tipo **Clase**.
4. Capturar nombre.
5. Seleccionar area.
6. Seleccionar maestro.
7. Seleccionar salon.
8. Definir cupo.
9. Activar o desactivar periodo indefinido.
10. Seleccionar dias de la semana.
11. Capturar hora inicio y hora termino por dia.
12. Guardar.

Una clase indefinida no tiene fecha de termino. Se usa para clases regulares que continuan semana a semana.

Si la clase tiene fecha fin, el sistema genera sesiones dentro del periodo indicado.

### 6.2 Crear un curso

1. Entrar a **Programacion**.
2. Presionar **Programar actividad**.
3. Seleccionar tipo **Curso**.
4. Capturar nombre.
5. Seleccionar area, maestro, salon y cupo.
6. Capturar fecha inicio.
7. Capturar fecha fin.
8. Seleccionar dias de la semana.
9. Capturar horario por dia.
10. Guardar.

**Nota:** Un curso debe tener fecha de inicio y fecha de fin. Puede tener varios dias por semana y cada dia puede tener un horario distinto.

### 6.3 Crear un taller

1. Entrar a **Programacion**.
2. Presionar **Programar actividad**.
3. Seleccionar tipo **Taller**.
4. Capturar nombre.
5. Seleccionar area, maestro, salon y cupo.
6. Capturar fecha inicio.
7. Capturar fecha fin.
8. Seleccionar dias de la semana.
9. Capturar horario por dia.
10. Guardar.

El taller funciona parecido al curso, pero normalmente se usa para actividades especiales o de duracion limitada.

### 6.4 Crear un evento

1. Entrar a **Programacion**.
2. Presionar **Programar actividad**.
3. Seleccionar tipo **Evento**.
4. Capturar nombre.
5. Definir numero de funciones.
6. Por cada funcion capturar:
   - Fecha.
   - Hora inicio.
   - Hora termino.
7. Seleccionar salon.
8. Seleccionar maestro o responsable si aplica.
9. Guardar.

Un evento no usa recurrencia semanal. Usa funciones puntuales. Si un evento tiene 5 funciones, se generan 5 sesiones.

### 6.5 Vista general de Programacion

En la vista general se muestran tarjetas de actividades. Cada tarjeta puede mostrar:

- Tipo: clase, curso, taller o evento.
- Nombre.
- Area.
- Maestro.
- Salon.
- Cupo.
- Dias y horarios.
- Periodo.
- Funciones, si es evento.

### 6.6 Detalle de actividad

Al abrir una actividad se muestra:

- Resumen general.
- Tipo de actividad.
- Maestro.
- Salon.
- Area.
- Cupo disponible.
- Dias y horarios, si es clase, curso o taller.
- Funciones, si es evento.
- Sesiones.
- Vista de sesiones por dia, semana o mes.
- Reservaciones.
- Pago por docencia, si aplica.

### 6.7 Reservar alumno

1. Entrar al detalle de la actividad.
2. Seleccionar la sesion correcta.
3. Presionar **Reservar alumno**.
4. Buscar o seleccionar el alumno.
5. Confirmar reservacion.

Si no hay cupo, el sistema puede mostrar la sesion como llena o deshabilitar la accion.

Si el alumno no tiene creditos, se debe vender un paquete desde **Caja / POS**.

**Nota operativa:** Cuando el sistema pide seleccionar sesion, se refiere al dia y horario exacto al que asistira el alumno.

---

## 7. Calendario operativo

El Calendario ayuda a visualizar sesiones y actividades programadas.

### Uso recomendado

1. Entrar a **Calendario**.
2. Revisar actividades del dia o periodo.
3. Identificar clases, cursos, talleres, eventos o rentas.
4. Confirmar horarios, maestros y espacios.
5. Si se requiere reservar, abrir la actividad correspondiente desde Programacion o Reservaciones.

**Nota:** El calendario es principalmente una vista de consulta operativa.

---

## 8. Inscripciones y membresias

Una inscripcion es el pago o registro inicial que habilita al alumno.

Una membresia es la compra de un paquete por parte de un alumno. La membresia da creditos o clases disponibles.

### Vender una inscripcion

1. Registrar al alumno en **Alumnos**.
2. Ir a **Caja / POS**.
3. Seleccionar concepto de inscripcion.
4. Seleccionar alumno.
5. Cobrar.

### Vender una membresia

1. Ir a **Caja / POS**.
2. Seleccionar paquete.
3. Seleccionar alumno.
4. Confirmar pago.
5. Revisar que los creditos se asignen al alumno.

### Revisar creditos de un alumno

1. Entrar al detalle del alumno.
2. Revisar membresias activas.
3. Confirmar creditos disponibles.

**Advertencia:** Si un alumno no tiene creditos disponibles, no debe reservarse manualmente sin antes resolver la compra o autorizacion correspondiente.

---

## 9. Paquetes

Paquetes sirve para configurar productos academicos. No es el punto principal de cobro.

### Crear paquete

1. Entrar a **Paquetes**.
2. Presionar **Nuevo producto academico** o **Nuevo paquete**.
3. Capturar nombre.
4. Seleccionar tipo.
5. Seleccionar area.
6. Capturar precio.
7. Capturar creditos.
8. Capturar porcentaje para maestro si aplica.
9. Guardar.

### Datos importantes de un paquete

| Campo | Significado |
| --- | --- |
| Nombre | Nombre comercial del paquete. |
| Tipo | Paquete, promocion, clase muestra o day pass, segun configuracion. |
| Area | Danza o musica. |
| Precio | Monto que se cobra al alumno. |
| Creditos | Cantidad de clases o usos disponibles. |
| Porcentaje / pago docente | Base para calcular pago por asistencia si aplica. |
| Estado | Indica si el paquete esta activo o inactivo. |

### Cobrar un paquete

1. Entrar a **Paquetes**.
2. Ubicar el paquete.
3. Presionar **Cobrar en Caja**.
4. Completar el cobro en **Caja / POS**.

**Nota:** El modulo Paquetes configura precios y creditos. El cobro se cierra en Caja / POS.

---

## 10. Caja / POS

Caja / POS es el punto unico oficial de cobro.

### Conceptos que se pueden cobrar

- Inscripcion.
- Paquetes.
- Day pass, si existe.
- Productos de tienda.
- Rentas.
- Cursos.
- Talleres.
- Eventos.

### Filtros disponibles

| Filtro | Uso |
| --- | --- |
| Todo | Muestra todos los conceptos disponibles. |
| Academico | Muestra conceptos relacionados con alumnos, inscripciones o paquetes. |
| Tienda | Muestra productos fisicos. |
| Rentas | Muestra conceptos de renta de espacios. |
| Cursos/Eventos | Muestra actividades cobrables si aplica. |

### Cobrar una venta

1. Entrar a **Caja / POS**.
2. Buscar o filtrar el concepto.
3. Agregar al carrito.
4. Seleccionar alumno si aplica.
5. Revisar cantidades y total.
6. Confirmar venta.
7. Revisar la confirmacion.

### Carrito

El carrito puede mezclar conceptos de diferentes categorias, por ejemplo:

- Un paquete de danza.
- Un producto de tienda.
- Una renta de salon.

**Advertencia:** No cierre cobros desde modulos administrativos. Use siempre Caja / POS.

---

## 11. Tienda

Tienda sirve para administrar productos fisicos e inventario. No es la caja principal.

### Crear producto

1. Entrar a **Tienda**.
2. Presionar **Nuevo producto**.
3. Capturar nombre.
4. Capturar descripcion.
5. Capturar precio de venta.
6. Capturar costo.
7. Capturar stock.
8. Subir imagen si aplica.
9. Guardar.

### Conceptos importantes

| Concepto | Significado |
| --- | --- |
| Stock | Cantidad disponible del producto. |
| Precio de venta | Precio cobrado al cliente. |
| Costo | Costo interno del producto. |
| Utilidad | Diferencia entre precio de venta y costo. |
| Activo/Inactivo | Indica si el producto puede venderse. |

### Cobrar producto

1. Entrar a **Tienda**.
2. Ubicar producto.
3. Presionar **Cobrar en Caja** si esta disponible.
4. Completar venta en **Caja / POS**.

---

## 12. Rentas y espacios

Rentas sirve para administrar reservas de salones o espacios.

### Crear renta

1. Entrar a **Rentas**.
2. Seleccionar espacio.
3. Capturar cliente o responsable.
4. Capturar fecha.
5. Capturar hora inicio y hora termino.
6. Revisar costo.
7. Guardar.
8. Enviar a Caja para cobrar.

### Consideraciones

- Una renta no es una clase.
- Una renta puede bloquear un espacio.
- El cobro se hace desde POS.
- El precio del salon puede calcularse por hora, segun configuracion.

---

## 13. Salones / Espacios

Este modulo sirve para administrar los espacios disponibles.

### Crear salon o espacio

1. Entrar a **Salones**.
2. Presionar **Nuevo espacio**.
3. Capturar nombre.
4. Capturar capacidad.
5. Capturar descripcion.
6. Guardar.

### Agregar articulos al salon

1. Entrar al salon.
2. Buscar la seccion de articulos.
3. Presionar **Agregar articulo**.
4. Capturar nombre del articulo.
5. Capturar cantidad.
6. Capturar estado o descripcion si aplica.
7. Guardar.

### Ejemplos de articulos

- Sillas.
- Mesas.
- Bocinas.
- Espejos.
- Tapetes.
- Proyector.
- Extensiones.
- Instrumentos.
- Equipo de sonido.

Registrar articulos ayuda a controlar que equipo pertenece a cada salon, facilita revisiones internas y apoya el control de inventario.

---

## 14. Asistencias y Check-in

Check-in sirve para marcar asistencia a una sesion real.

### Registrar asistencia desde Check-in

1. Entrar a **Check-in**.
2. Seleccionar clase, curso, taller o evento.
3. Seleccionar sesion.
4. Revisar alumnos reservados.
5. Marcar asistencia.
6. Guardar o confirmar la accion.

### Conceptos importantes

| Concepto | Significado |
| --- | --- |
| Sesion | Dia y horario exacto de la actividad. |
| Alumno reservado | Alumno que aparto lugar en esa sesion. |
| Alumno asistio | Alumno que fue marcado como presente. |
| Credito consumido | Credito descontado al alumno por asistir. |
| Historial de asistencias | Registro de asistencias anteriores. |

### Historial de asistencias

El historial permite revisar:

- Total de asistencias.
- Creditos consumidos.
- Pago por docencia.
- Area danza o musica.
- Filtros por periodo o estado.

**Nota:** Es recomendable registrar asistencia el mismo dia de la sesion para mantener creditos, pagos y reportes actualizados.

---

## 15. Pago a maestros

El modulo de Pagos a maestros permite revisar el pago generado por asistencias registradas.

### Como se calcula

El pago puede depender de:

- La asistencia registrada.
- El paquete usado por el alumno.
- El porcentaje o monto configurado para docencia.
- La sesion correspondiente.
- El maestro asignado a la actividad.

### Revisar pago por maestro

1. Entrar a **Pagos a maestros**.
2. Seleccionar periodo si aplica.
3. Revisar resumen por maestro.
4. Abrir detalle si se requiere.
5. Verificar sesiones con asistencia.
6. Revisar montos calculados.

**Advertencia:** Si no se registran asistencias, los pagos por docencia pueden no aparecer o aparecer incompletos.

---

## 16. Finanzas, gastos y reportes

Finanzas muestra informacion de consulta. No se cobra desde Finanzas.

### Que se puede consultar

- Ingresos generados desde Caja / POS.
- Gastos registrados.
- Utilidad.
- Ventas por periodo.
- Reportes financieros.
- Corte de caja.

### Revisar Finanzas

1. Entrar a **Finanzas**.
2. Seleccionar periodo.
3. Revisar ingresos.
4. Revisar gastos.
5. Revisar utilidad.
6. Consultar tablas o reportes disponibles.

### Registrar gastos

1. Entrar a **Gastos**.
2. Presionar nuevo gasto si aplica.
3. Capturar concepto.
4. Capturar monto.
5. Capturar fecha.
6. Guardar.

### Corte de caja

1. Entrar a **Corte de caja**.
2. Seleccionar periodo o turno.
3. Revisar ventas.
4. Revisar totales.
5. Confirmar diferencias si existieran.

**Nota:** Finanzas y reportes sirven para revisar informacion. Las ventas se realizan desde Caja / POS.

---

## 17. Notificaciones y alertas

Las notificaciones son avisos del sistema que ayudan a dar seguimiento a situaciones importantes.

Las alertas son mensajes operativos que requieren atencion.

### Tipos de alertas posibles

- Alumno con creditos bajos.
- Alumno sin creditos.
- Membresia proxima a vencer.
- Membresia vencida.
- Clase proxima.
- Renta proxima.
- Pago pendiente.
- Stock bajo en tienda.
- Asistencia pendiente.
- Cupo lleno.
- Evento proximo.

### Como funcionan

1. El sistema detecta una condicion.
2. Muestra un aviso o alerta.
3. El encargado revisa el mensaje.
4. Se toma accion desde el modulo correspondiente.

### Ejemplos

| Alerta | Accion recomendada |
| --- | --- |
| Alumno con pocos creditos | Ir a Caja / POS para vender paquete. |
| Membresia por vencer | Contactar al alumno. |
| Producto con stock bajo | Revisar Tienda. |
| Sesion sin asistencia registrada | Ir a Check-in. |
| Cupo lleno | No forzar reservaciones sin autorizacion. |

---

## 18. Usuarios y permisos

El modulo de Usuarios permite administrar accesos y roles.

### Roles comunes

| Rol | Uso principal |
| --- | --- |
| Direccion / Super Admin | Acceso completo, configuracion y supervision general. |
| Admin | Administracion operativa y financiera. |
| Recepcion | Registro de alumnos, reservas, caja y operaciones diarias. |
| Maestro | Consulta de actividades, sesiones o asistencias segun permisos. |

Las opciones del sistema pueden aparecer u ocultarse segun el permiso del usuario.

### Crear o editar usuario

1. Entrar a **Usuarios / Admin**.
2. Presionar nuevo usuario o seleccionar uno existente.
3. Capturar nombre y usuario.
4. Seleccionar rol.
5. Guardar.

**Advertencia:** Asigne permisos con cuidado. No todos los usuarios deben tener acceso a Finanzas, Usuarios o Configuracion.

---

## 19. Modo oscuro

El sistema cuenta con modo claro y modo oscuro.

### Activar modo oscuro

1. Ir al encabezado superior.
2. Presionar el boton de tema.
3. Seleccionar o alternar a **Modo oscuro**.

### Volver a modo claro

1. Presionar nuevamente el boton de tema.
2. El sistema vuelve a modo claro.

La preferencia se guarda automaticamente, por lo que al recargar o volver a entrar se conserva el tema elegido.

---

## 20. Buenas practicas operativas

- Registrar alumnos antes de cobrar paquetes.
- Cobrar siempre desde **Caja / POS**.
- Programar clases, cursos, talleres y eventos desde **Programacion**.
- Revisar cupos antes de reservar.
- Registrar asistencia el mismo dia.
- Mantener stock actualizado.
- Registrar articulos de salones.
- Revisar alertas diariamente.
- Evitar ventas duplicadas desde modulos administrativos.
- Revisar Finanzas y Corte de caja al cierre del dia.
- Confirmar que la sesion seleccionada sea la correcta antes de reservar o marcar asistencia.

**Regla clave:** Programacion organiza actividades. Caja / POS cobra. Finanzas consulta.

---

## 21. Preguntas frecuentes

### Donde creo un curso?

En **Programacion**, seleccionando tipo **Curso**.

### Donde vendo un paquete?

En **Caja / POS**.

### Donde creo un paquete?

En **Paquetes**.

### Donde vendo un producto?

En **Caja / POS**.

### Donde creo un producto?

En **Tienda**.

### Donde registro una renta?

En **Rentas**.

### Donde cobro una renta?

En **Caja / POS**.

### Que hago si un alumno no tiene creditos?

Vender un nuevo paquete desde **Caja / POS** o revisar su membresia activa.

### Que es una sesion?

Es la ocurrencia real de una actividad en una fecha y horario especifico.

### Por que no aparece cupo?

Porque la sesion puede estar llena, cancelada o fuera del periodo disponible.

### Donde veo ingresos?

En **Dashboard**, **Finanzas**, **Reportes** o **Corte de caja**, segun el nivel de detalle requerido.

### Donde activo modo oscuro?

En el boton de tema del encabezado.

### Por que Paquetes no debe usarse para cobrar directamente?

Porque Paquetes sirve para configurar precios, creditos y reglas del producto academico. El cobro oficial se realiza en **Caja / POS**.

### Por que Tienda no debe usarse como caja?

Porque Tienda administra inventario. La venta se completa desde **Caja / POS**.

### Que hago si una asistencia no aparece en pago a maestros?

Revise que la asistencia este registrada en la sesion correcta y que el alumno tenga un paquete asociado que permita calcular pago por docencia.

---

## 22. Resumen operativo rapido

| Necesidad | Modulo correcto |
| --- | --- |
| Crear alumno | Alumnos |
| Crear clase, curso, taller o evento | Programacion |
| Reservar alumno | Detalle de Programacion o Reservaciones |
| Marcar asistencia | Check-in |
| Ver historial de asistencias | Asistencias |
| Configurar paquete | Paquetes |
| Cobrar paquete | Caja / POS |
| Crear producto fisico | Tienda |
| Cobrar producto | Caja / POS |
| Crear renta | Rentas |
| Cobrar renta | Caja / POS |
| Administrar salones | Salones |
| Ver ingresos | Dashboard / Finanzas |
| Revisar gastos | Gastos |
| Revisar corte | Corte de caja |
| Administrar usuarios | Usuarios / Admin |
| Cambiar tema | Boton de tema en encabezado |

---

## 23. Glosario rapido

| Termino | Definicion breve |
| --- | --- |
| Actividad | Clase, curso, taller o evento creado en Programacion. |
| Funcion | Fecha y horario puntual de un evento. |
| Cupo | Numero maximo de alumnos para una sesion o actividad. |
| Credito | Unidad disponible para asistir a una sesion. |
| Venta | Cobro confirmado desde Caja / POS. |
| Stock | Cantidad disponible de un producto de tienda. |
| Utilidad | Diferencia entre ingreso y costo/gasto. |
| Corte | Revision de ventas y totales de caja en un periodo. |

---

## 24. Cierre

El Atico Admin centraliza la operacion academica y administrativa para que cada proceso tenga un lugar claro:

- **Programacion** crea actividades.
- **Caja / POS** cobra.
- **Alumnos** concentra informacion de estudiantes.
- **Check-in** confirma asistencia.
- **Finanzas** permite revisar resultados.
- **Tienda, Paquetes y Rentas** administran conceptos que pueden cobrarse desde Caja.

Usar cada modulo para su proposito evita duplicidad, mejora el control y mantiene informacion confiable para recepcion, administracion y direccion.
