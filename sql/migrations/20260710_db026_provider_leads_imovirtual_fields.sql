-- DB-026: Campos normalizados do Imovirtual em provider_leads.
-- Sem alteração de RLS, autenticação ou RBAC.
alter table public.provider_leads
  add column if not exists area numeric null,
  add column if not exists rooms text null,
  add column if not exists city text null,
  add column if not exists district text null,
  add column if not exists owner_name text null,
  add column if not exists is_private_owner boolean not null default false,
  add column if not exists created_at_first timestamptz null,
  add column if not exists short_description text null,
  add column if not exists source text null;

update public.provider_leads
set area = coalesce(area, nullif(raw_data ->> 'area', '')::numeric),
    rooms = coalesce(rooms, nullif(raw_data ->> 'rooms', '')),
    city = coalesce(city, nullif(raw_data ->> 'city', '')),
    district = coalesce(district, nullif(raw_data ->> 'district', '')),
    owner_name = coalesce(owner_name, nullif(raw_data ->> 'ownerName', '')),
    is_private_owner = case
      when raw_data ? 'isPrivateOwner' then coalesce((raw_data ->> 'isPrivateOwner')::boolean, false)
      else is_private_owner
    end,
    created_at_first = coalesce(created_at_first, nullif(raw_data ->> 'createdAtFirst', '')::timestamptz),
    short_description = coalesce(short_description, nullif(raw_data ->> 'shortDescription', '')),
    source = coalesce(source, nullif(raw_data ->> 'source', '')),
    updated_at = now();

create index if not exists idx_provider_leads_imovirtual_created_at_first on public.provider_leads (provider, created_at_first desc);
create index if not exists idx_provider_leads_imovirtual_private_district_price on public.provider_leads (provider, is_private_owner, district, price);
