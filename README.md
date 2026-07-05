# MusiCafé Manager

Sistema web para administrar una cafetería, publicado con GitHub Pages y conectado a la base de datos de MusiCafé.

Esta versión reemplaza la idea anterior de Ferma y deja la app preparada como **MusiCafé**. No depende de Google Sheets ni de Apps Script: productos, clientes, ventas, gastos, configuración, movimientos de inventario y borrador del carrito se guardan en Firestore.

## Qué trae esta versión

- POS funcional con carrito, cliente, método de pago, descuento y notas.
- Guardado de ventas en `sales`.
- Descuento automático de stock en `products` al cobrar.
- Registro de movimientos en `inventoryMovements`.
- Inventario con productos, precio, costo, margen, stock mínimo, activación/desactivación y ajustes de stock.
- Clientes con teléfono, email, notas, visitas, puntos y total comprado.
- Gastos por fecha, categoría, proveedor, método de pago y notas.
- Dashboard con ventas del día, utilidad estimada, ticket promedio, stock bajo, ventas del mes, gastos del mes y productos estrella.
- Exportación CSV de ventas y gastos.
- Backup JSON completo.
- Importación desde JSON.
- Configuración en `settings/cafe`.
- Login con Google y reglas de seguridad por correos autorizados.
- GitHub Pages listo para publicar directamente desde la raíz de `main`.
- Configuración alternativa de alojamiento incluida en `firebase.json`.

## Estructura de Firestore

```txt
settings/cafe
products/{productId}
customers/{customerId}
sales/{saleId}
expenses/{expenseId}
inventoryMovements/{movementId}
draftCarts/{uid}
```

### Productos

```js
{
  name: 'Latte',
  category: 'Bebidas calientes',
  price: 8000,
  cost: 3100,
  stock: 45,
  minStock: 10,
  sku: 'CAF-LATT',
  unit: 'vaso',
  active: true,
  notes: '',
  createdAt,
  updatedAt
}
```

### Ventas

```js
{
  saleNo: 'MC-20260615-AB12',
  dateKey: '2026-06-15',
  monthKey: '2026-06',
  status: 'paid',
  paymentMethod: 'Efectivo',
  customerId: '',
  customerName: 'Cliente ocasional',
  items: [
    { productId, name, qty, price, cost, subtotal, profit }
  ],
  totals: { subtotal, discount, total, cost, profit },
  notes: '',
  createdAt,
  createdBy,
  createdByEmail
}
```

## Primer montaje en Firebase

### 1. Instala Firebase CLI

```bash
npm install -g firebase-tools
```

También puedes instalar dependencias locales del proyecto:

```bash
npm install
```

### 2. Inicia sesión

```bash
firebase login
```

### 3. Entra a la carpeta del proyecto

```bash
cd musicafe-firestore-manager
```

El proyecto ya trae `.firebaserc` apuntando a:

```txt
db-musicafe
```

Si necesitas cambiarlo:

```bash
firebase use --add
```

### 4. Activa Firebase Authentication

En Firebase Console:

1. Entra a **Authentication**.
2. Activa **Sign-in method**.
3. Habilita **Google**.
4. Guarda.

La app usa login con Google. Las reglas actuales solo permiten estas cuentas:

```txt
alekcaballeromusic@gmail.com
catalina.medina.leal@gmail.com
imusicala@gmail.com
musicalaasesor@gmail.com
```

Puedes editar la lista en `firestore.rules`.

### 5. Activa Cloud Firestore

En Firebase Console:

1. Entra a **Firestore Database**.
2. Crea la base de datos.
3. Usa modo producción.
4. Escoge la región que prefieras.

### 6. Prueba localmente

```bash
firebase emulators:start --only hosting,firestore
```

Abre la URL que te da la terminal. Para probar con datos reales de tu proyecto Firebase, también puedes servir solo hosting:

```bash
firebase emulators:start --only hosting
```

### 7. Despliega reglas y hosting

```bash
firebase deploy --only firestore:rules,firestore:indexes
firebase deploy --only hosting
```

O todo de una:

```bash
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

Después Firebase te mostrará una URL parecida a:

```txt
https://db-musicafe.web.app
```

## Primer uso dentro de la app

1. Entra con Google.
2. Ve a **Inventario**.
3. Crea productos manualmente o usa **Cargar demo**.
4. Ve a **POS**.
5. Haz una venta de prueba.
6. Revisa **Ventas**, **Dashboard** e **Inventario** para confirmar que se descontó stock.

## Seguridad importante

Las reglas actuales son más seguras que dejar todo abierto, pero siguen siendo una versión inicial. Para producción grande conviene evolucionar a roles reales: admin, caja, inventario, solo lectura, etc. Por ahora la protección está por correos autorizados.

Si una persona no está en la lista de `firestore.rules`, podrá iniciar sesión con Google, pero Firestore rechazará lectura y escritura.

## Archivos principales

```txt
firebase.json                 Configuración de Hosting y Firestore
.firebaserc                   Proyecto Firebase por defecto
firestore.rules               Reglas de seguridad
firestore.indexes.json        Índices de Firestore
index.html                    App principal
styles.css                    Estilos
src/app.js                    Lógica completa de la app
manifest.webmanifest          Configuración instalable
sw.js                         Caché básico
logo.png                      Logo de MusiCafé
```

## Siguientes mejoras recomendadas

- Roles por usuario en `users/{uid}`.
- Cierres de caja por turno.
- Impresión de tickets térmicos.
- Módulo de proveedores y compras.
- Recetas / insumos por producto para descontar inventario compuesto.
- Reporte de utilidad neta real.
- Estadísticas por hora y día.
- Dashboard para productos lentos o vencimientos.
- Conexión futura con facturación electrónica si la operación crece.
