-- Cuaderno de Tienda — esquema de base de datos para Supabase
--
-- Cómo usarlo: en el panel de Supabase, ve a "SQL Editor" (icono de
-- terminal en el menú lateral) → "New query" → pega todo este archivo →
-- "Run". Se crean las tres tablas de golpe.

create table if not exists products (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  cost numeric not null default 0,
  category text,
  stock integer not null default 0,
  min_stock integer not null default 0,
  barcode text,
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key,
  name text not null,
  phone text,
  updated_at timestamptz not null default now()
);

create table if not exists sales (
  id text primary key,
  order_id text,
  client_id text references clients(id) on delete set null,
  product_id text references products(id) on delete set null,
  qty integer not null,
  date date not null,
  total numeric not null,
  cost numeric not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists sales_date_idx on sales (date);
create index if not exists sales_client_idx on sales (client_id);
create index if not exists products_barcode_idx on products (barcode);

-- Seguridad: la app ya está protegida por la contraseña de acceso al
-- sitio (la Edge Function de Netlify) — esa es la puerta de entrada
-- principal. Aquí en Supabase activamos Row Level Security y damos
-- acceso completo a la clave "anon" (la que va en el código de la
-- app), ya que quien llega hasta aquí ya pasó por esa contraseña.
alter table products enable row level security;
alter table clients enable row level security;
alter table sales enable row level security;

create policy "allow all to anon" on products for all using (true) with check (true);
create policy "allow all to anon" on clients for all using (true) with check (true);
create policy "allow all to anon" on sales for all using (true) with check (true);
