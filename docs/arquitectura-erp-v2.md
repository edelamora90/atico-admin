# El Ático ERP v2

## Objetivo

Evolucionar el sistema actual de administración hacia un ERP especializado para academias de danza, música y movimiento.

El sistema debe centralizar:

- Alumnos
- Inscripciones
- Paquetes
- Promociones
- Clase muestra
- Day Pass
- Tienda
- Rentas
- Eventos
- Caja
- Finanzas
- Asistencias
- Agenda
- Reportes

---

# Módulos principales

## 1. Dashboard

Debe responder:

¿Qué requiere atención hoy?

Indicadores:

- Alumnos activos
- Alumnos por renovar
- Inscripciones próximas a vencer
- Créditos próximos a vencer
- Ingresos del día
- Ingresos del mes
- Utilidad reconocida
- Ventas de tienda
- Rentas
- Productos con stock bajo
- Clase muestra pendiente de convertir

---

## 2. Recepción

Flujo rápido:

1. Buscar alumno
2. Abrir expediente
3. Nueva venta
4. Reservar clase
5. Registrar asistencia

---

## 3. Expediente del alumno

Pestañas:

- General
- Membresía
- Finanzas
- Asistencias
- Historial

Debe mostrar claramente:

- Vencimiento de créditos
- Vencimiento de inscripción
- Créditos disponibles
- Estado del alumno
- Próxima acción sugerida

---

## 4. Punto de Venta POS

Será el corazón comercial del sistema.

Todo se venderá desde aquí:

- Inscripción
- Clase muestra
- Day Pass
- Paquete
- Promoción
- Producto de tienda
- Evento
- Renta

El POS solo debe mostrar productos válidos según el estado del alumno.

---

## 5. Catálogo comercial unificado

Reemplazará gradualmente:

- Paquetes
- Promociones
- Tienda
- Eventos
- Rentas

Entidad futura: Product

Campos sugeridos:

- name
- type
- category
- price
- cost
- stock
- academicArea
- creditsGenerated
- requiresEnrollment
- includesFreeInscription
- isTrial
- isDayPass
- active
- imageUrl

---

## 6. Caja

Debe manejar:

- Apertura de caja
- Ventas
- Ingresos
- Gastos
- Cortes
- Métodos de pago
- Efectivo esperado
- Utilidad reconocida
- Dinero pendiente por consumir

---

## 7. Finanzas

Debe separar:

- Dinero recibido
- Utilidad reconocida
- Dinero pendiente por consumir
- Gastos
- Pago a maestros
- Utilidad retirable

---

## 8. Académico

Incluye:

- Clases
- Cursos
- Talleres
- Maestros
- Asistencias
- Reservaciones
- Calendario

---

# Reglas de negocio importantes

## Créditos

Los créditos vencen 30 días después de comprarse.

## Inscripción

La inscripción debe vencer 30 días después de que el alumno se queda sin créditos activos o no renueva.

Debe mostrarse separada del vencimiento de créditos.

## Clase muestra

- No requiere inscripción.
- Genera 1 crédito.
- Solo puede usarse una vez.

## Day Pass

- No requiere inscripción.
- Permite tomar una clase puntual.

## Paquetes normales

- Requieren inscripción.

## Promociones

Pueden configurarse para:

- Requerir inscripción
- No requerir inscripción
- Incluir inscripción gratis

---

# Fases de migración

## Fase 1

Ordenar reglas actuales sin romper módulos existentes.

- Paquetes con tipo
- Promociones
- Clase muestra
- Day Pass
- Inscripción gratis
- Vencimiento de inscripción
- Vencimiento de créditos separado

## Fase 2

Rediseñar Membresías como POS académico.

- Alumno seleccionado
- Catálogo filtrado
- Carrito
- Finalizar venta

## Fase 3

Unificar productos.

- Product
- Sale
- SaleItem

## Fase 4

Caja y cortes.

- Apertura
- Cierre
- Métodos de pago
- Reporte diario

## Fase 5

Dashboard estratégico.

- Alertas
- Renovaciones
- Conversiones
- Finanzas
- Inventario
