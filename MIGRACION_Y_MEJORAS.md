# Migración de Ferma a MusiCafé

## Cambio principal

La app anterior estaba pensada alrededor de una API externa tipo Apps Script/Sheets. Esta versión deja el sistema como una app de cafetería conectada directamente a Firebase:

- Antes: Ferma + API / caché local.
- Ahora: MusiCafé + Firebase Hosting + Firestore + Google Auth.

## Mejoras funcionales aplicadas

### 1. Identidad MusiCafé

- Se cambió la marca visible a MusiCafé.
- Se conservó el logo original del ZIP como base visual.
- Se ajustó el diseño hacia una estética café/premium, más cálida y menos genérica.

### 2. Firestore como base principal

Ahora se guardan en Firestore:

- Productos.
- Clientes.
- Ventas.
- Gastos.
- Configuración.
- Movimientos de inventario.
- Borrador del carrito por usuario.

### 3. POS mejorado

- Productos táctiles por categoría.
- Carrito con cantidades.
- Cliente opcional.
- Método de pago.
- Descuento.
- Notas de venta.
- Cobro con transacción Firestore.
- Descuento automático de stock.
- Bloqueo si el stock no alcanza.
- Registro de movimiento por cada producto vendido.

### 4. Inventario mejorado

- Formulario completo de producto.
- Precio, costo y margen.
- Stock y stock mínimo.
- SKU y unidad.
- Activar/desactivar producto para el POS.
- Ajuste manual de stock.
- Carga de productos demo.
- Alertas de stock bajo.

### 5. Clientes

- Registro de nombre, teléfono, email y notas.
- Acumulación automática de visitas, puntos y total comprado cuando se asocia una venta.

### 6. Gastos

- Registro por fecha.
- Categorías base: insumos, servicios, arriendo, nómina, transporte, marketing, mantenimiento y otros.
- Proveedor, método de pago y notas.
- Filtros por fecha.
- Exportación CSV.

### 7. Ventas y reportes

- Historial de ventas.
- Filtro por fechas.
- Exportación CSV.
- Anulación de ventas con devolución de stock.
- Resumen de total vendido, utilidad estimada y órdenes.

### 8. Dashboard

- Ventas del día.
- Utilidad estimada del día.
- Ticket promedio.
- Stock bajo.
- Ventas del mes.
- Gastos del mes.
- Utilidad bruta del mes.
- Alertas inteligentes.
- Top productos.
- Últimas ventas.

### 9. Backup

- Exportación JSON completa.
- Importación desde JSON.

### 10. Firebase Hosting listo

Se agregaron:

- `firebase.json`
- `.firebaserc`
- `firestore.rules`
- `firestore.indexes.json`
- `package.json` con scripts de deploy.

## Cosas que no dejé como definitivas todavía

Estas partes quedan listas para evolucionar, pero no conviene sobrecomplicar esta primera versión:

- Roles por usuario.
- Cierres de caja por turno.
- Proveedores avanzados.
- Compras con entrada automática de stock.
- Recetas / insumos compuestos.
- Facturación electrónica.
- Impresión real de tickets.

## Ruta sugerida después de probar esta versión

1. Probar login y permisos.
2. Cargar productos reales.
3. Hacer ventas falsas de prueba.
4. Revisar que el stock baje correctamente.
5. Registrar gastos reales durante unos días.
6. Ajustar categorías, nombres y flujo de caja.
7. Agregar cierre de caja por día/turno.
8. Agregar roles para que no todos puedan borrar/anular.
