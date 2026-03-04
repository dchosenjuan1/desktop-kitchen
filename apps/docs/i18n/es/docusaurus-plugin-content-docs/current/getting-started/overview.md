---
sidebar_position: 1
slug: /getting-started/overview
title: Vista General de la Plataforma
---

# Vista General de la Plataforma

Desktop Kitchen es una plataforma POS multi-tenant creada para restaurantes independientes de servicio rapido (QSR) y operadores de comida casual rapida. Ya sea que tengas una taqueria, una hamburgueseria, una pizzeria o cualquier concepto de mostrador, Desktop Kitchen combina operaciones de punto de venta, gestion de delivery, seguimiento de inventario, programas de lealtad e inteligencia impulsada por IA en un solo sistema.

## Conceptos Clave

### Tenants

Cada restaurante (o grupo de restaurantes) opera como un **tenant** dentro de una sola base de datos compartida en Neon Postgres, aislado por Row Level Security (RLS). Los tenants obtienen su propio subdominio (por ejemplo, `turestaurante.desktop.kitchen`), marca, menu, empleados y datos — completamente separados de otros tenants a nivel de base de datos.

Cada tabla con alcance de tenant contiene una columna `tenant_id`, y las politicas de RLS aseguran que las consultas de un tenant nunca puedan ver los datos de otro.

### Marcas (Marcas Virtuales)

Una sola cocina puede operar multiples **marcas virtuales** — diferentes presentaciones de menu para diferentes plataformas de delivery. Por ejemplo, tu restaurante fisico tambien podria aparecer como una marca solo de hamburguesas en Uber Eats y una marca de alitas en Rappi, todo preparado desde la misma cocina.

### Plataformas de Delivery

El sistema se integra con las principales plataformas de delivery:
- **Uber Eats**
- **Rappi**
- **DiDi Food**

Los pedidos de estas plataformas llegan a la misma cola de cocina que los pedidos del POS en tienda, con reglas de markup por plataforma y seguimiento de P&L.

### Roles de Empleados

El acceso se controla mediante permisos basados en roles:

| Rol | Acceso |
|-----|--------|
| **Cajero** | Pantalla del POS, tomar pedidos, procesar pagos |
| **Cocina** | Pantalla de cocina, preparacion de pedidos |
| **Bar** | Pantalla de bar, preparacion de bebidas |
| **Gerente** | Todo lo anterior + reportes, inventario, gestion de empleados |
| **Admin** | Acceso completo incluyendo configuracion del sistema |

### Pagos

- Pagos en **efectivo** con calculo de cambio
- Pagos con **tarjeta** via Stripe (chip, tap, entrada manual)
- **Pagos divididos** (efectivo parcial + tarjeta)

## Arquitectura General

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   App POS    │    │  Pantalla   │    │ Plataformas │
│  (Cajero)    │    │  de Cocina  │    │  de Delivery│
└──────┬───────┘    └──────┬──────┘    └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │   Express   │
                    │   Backend   │
                    └──────┬──────┘
                           │
               ┌───────────┴───────────┐
               │    Neon Postgres      │
               │  (BD compartida + RLS)│
               ├───────────────────────┤
               │ adminSql (neondb_owner│
               │  — sin RLS)           │
               │ tenantSql (app_user   │
               │  — con RLS)           │
               └───────────────────────┘
```

:::info Dos pools de conexion
El backend mantiene dos pools de base de datos. El **pool admin** (`neondb_owner`) omite RLS para autenticacion, operaciones de super admin y trabajos en segundo plano de IA. El **pool de tenant** (`app_user`) aplica RLS para todas las rutas de API con alcance de tenant — el tenant actual se establece via `set_config('app.tenant_id', ...)` por conexion.
:::

## Que Sigue?

- [Requisitos del Sistema](./system-requirements) — lo que necesitas para comenzar
- [Guia de Configuracion Inicial](./onboarding) — registra y configura tu primer restaurante
- [Tu Primera Orden](./first-order) — realiza tu primer pedido de principio a fin
