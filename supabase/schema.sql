-- Geo-Intel Brief schema

create table if not exists public.generations (
  id uuid primary key,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  progress int not null default 0,
  regions text[] not null,
  custom_tag text,
  limit_per_region int not null,
  gamma_instructions text,
  gamma_generation_id text,
  gamma_url text,
  pdf_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brief_items (
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.generations(id) on delete cascade,
  region text not null,
  title text not null,
  summary text,
  source_name text,
  source_url text,
  published_at timestamptz,
  original_image_url text,
  ai_image_path text,
  ai_image_url text,
  created_at timestamptz not null default now()
);

create unique index if not exists brief_items_generation_source_url_uniq
  on public.brief_items(generation_id, source_url)
  where source_url is not null;

create index if not exists brief_items_generation_id_idx
  on public.brief_items(generation_id);

create index if not exists generations_status_idx
  on public.generations(status);
