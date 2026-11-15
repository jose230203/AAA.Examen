# Sistema de ventas e inventario para consorcio de tiendas de ropa usada

Aplicación web para gestionar el inventario, las ventas y los traspasos de 4 sucursales de ropa usada.
Cada prenda es una unidad única (código, talla, condición, costo y precio), por eso el inventario se
controla por prenda y no por cantidades.

## Stack
Next.js (App Router) · TypeScript · Tailwind CSS · React Hook Form · Zod · Lucide · Prisma · PostgreSQL (Railway) · Auth.js · bcrypt · Vercel · Vitest

## Módulos
- **Autenticación**: login con bloqueo temporal tras 5 intentos fallidos, sesión de 8 horas, cambio de contraseña.
- **Inventario**: alta, edición, baja, filtros, búsqueda y paginación. Historial de cambios por prenda.
- **Caja (POS)**: escaneo o búsqueda por código, descuento, método de pago, cambio y ticket imprimible.
- **Ventas**: historial y anulación (la prenda vuelve al inventario).
- **Traspasos**: crear, enviar, recibir y cancelar entre sucursales.
- **Reportes**: ventas por día, sucursal, cajero, método y categoría, utilidad, stock, antigüedad y exportación a CSV.
- **Administración**: usuarios, roles, sucursales y categorías.

## Roles
| Acción | Cajero | Encargado | Admin |
|---|---|---|---|
| Vender | Sí (su sucursal, descuento máx. 10%) | Sí (descuento máx. 30%) | Si tiene sucursal |
| Ver costos | No | Sí (su sucursal) | Sí |
| Registrar, editar y dar de baja prendas | No | Su sucursal | Todas |
| Anular ventas | No | Su sucursal | Todas |
| Traspasos | No | Su sucursal | Todas |
| Reportes | No | Su sucursal | Todas |
| Usuarios, sucursales y categorías | No | No | Sí |

## Validaciones y manejo de errores
- Validación con Zod en formularios y de nuevo en el servidor (nunca se confía en el cliente).
- Precios y totales se calculan siempre en el servidor con precios de la base de datos.
- Transacciones atómicas: una prenda no puede venderse ni traspasarse dos veces aunque dos usuarios actúen a la vez.
- Errores propios (`AppError`) traducidos a mensajes claros; errores de Prisma y de conexión controlados.
- Auditoría de ventas, anulaciones, traspasos, ediciones y cambios de usuarios.

## Puesta en marcha
```bash
npm install
cp .env.example .env        # completar DATABASE_URL y AUTH_SECRET
npx prisma migrate deploy
npx prisma db seed          # sucursales, categorías y usuarios de demostración
npm run dev
```

Variables de entorno: `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 32`), `AUTH_TRUST_HOST=true`.

## Pruebas
```bash
npm run test:db:migrate     # una vez, sobre la BD de pruebas definida en .env.test
npm test
```
Las pruebas de integración usan una base de datos separada (`.env.test`) y se niegan a ejecutarse contra la principal.
