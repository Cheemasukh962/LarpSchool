-- Phase 3 economy. Paste into the Supabase SQL editor. Safe to run twice.
-- Wallet lives here. The browser may animate a spin; it may not invent tokens.

create table if not exists ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  player_id uuid not null references players(id) on delete cascade,
  kind text not null,
  delta integer not null,
  idempotency_key text not null,
  meta jsonb not null default '{}'::jsonb,
  unique (player_id, idempotency_key)
);

create index if not exists ledger_player_created on ledger (player_id, created_at desc);
create index if not exists ledger_player_kind_created on ledger (player_id, kind, created_at desc);

create table if not exists economy (
  id integer primary key default 1 check (id = 1),
  jackpot integer not null default 50
);

insert into economy (id, jackpot) values (1, 50) on conflict (id) do nothing;

alter table ledger enable row level security;
alter table economy enable row level security;

drop policy if exists "no client access ledger" on ledger;
drop policy if exists "no client access economy" on economy;

-- ── credit (battle win, trivia) ──────────────────────────────────────────

create or replace function wallet_credit(
  p_player uuid,
  p_amount integer,
  p_kind text,
  p_key text,
  p_meta jsonb default '{}'::jsonb,
  p_min_interval_ms integer default 400
) returns jsonb
language plpgsql
as $$
declare
  v_tokens integer;
  v_won integer;
  v_tc integer;
  v_ta integer;
  v_existing ledger%rowtype;
  v_last timestamptz;
begin
  if p_amount < 0 then
    raise exception 'bad_amount' using errcode = 'P0001';
  end if;
  if p_amount = 0 and p_kind not in ('trivia_wrong', 'battle_loss') then
    raise exception 'bad_amount' using errcode = 'P0001';
  end if;

  select tokens, battles_won, trivia_correct, trivia_answered
    into v_tokens, v_won, v_tc, v_ta
    from players
   where id = p_player
   for update;
  if not found then
    raise exception 'no_player' using errcode = 'P0001';
  end if;

  select * into v_existing
    from ledger
   where player_id = p_player and idempotency_key = p_key;
  if found then
    return jsonb_build_object(
      'replay', true,
      'tokens', v_tokens,
      'battlesWon', v_won,
      'triviaCorrect', v_tc,
      'triviaAnswered', v_ta,
      'delta', v_existing.delta,
      'meta', v_existing.meta
    );
  end if;

  if p_min_interval_ms > 0 then
    select created_at into v_last
      from ledger
     where player_id = p_player and kind = p_kind
     order by created_at desc
     limit 1;
    if v_last is not null and v_last > clock_timestamp() - (p_min_interval_ms * interval '1 millisecond') then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  v_tokens := v_tokens + p_amount;
  if p_kind = 'battle_win' then
    v_won := v_won + 1;
  end if;
  if p_kind = 'trivia_correct' then
    v_tc := v_tc + 1;
    v_ta := v_ta + 1;
  elsif p_kind = 'trivia_wrong' then
    v_ta := v_ta + 1;
  end if;

  update players
     set tokens = v_tokens,
         battles_won = v_won,
         trivia_correct = v_tc,
         trivia_answered = v_ta
   where id = p_player;

  insert into ledger (player_id, kind, delta, idempotency_key, meta)
  values (p_player, p_kind, p_amount, p_key, coalesce(p_meta, '{}'::jsonb));

  return jsonb_build_object(
    'replay', false,
    'tokens', v_tokens,
    'battlesWon', v_won,
    'triviaCorrect', v_tc,
    'triviaAnswered', v_ta,
    'delta', p_amount,
    'meta', coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

-- ── slots: one row, net delta, jackpot locked with the player ────────────

create or replace function wallet_spin(
  p_player uuid,
  p_bet integer,
  p_payout integer,
  p_jackpot_hit boolean,
  p_key text,
  p_meta jsonb default '{}'::jsonb,
  p_min_interval_ms integer default 500
) returns jsonb
language plpgsql
as $$
declare
  v_tokens integer;
  v_jackpot integer;
  v_existing ledger%rowtype;
  v_last timestamptz;
  v_delta integer;
begin
  if p_bet not in (1, 2, 5) or p_payout < 0 then
    raise exception 'bad_bet' using errcode = 'P0001';
  end if;

  select tokens into v_tokens from players where id = p_player for update;
  if not found then
    raise exception 'no_player' using errcode = 'P0001';
  end if;

  insert into economy (id, jackpot) values (1, 50) on conflict (id) do nothing;
  select jackpot into v_jackpot from economy where id = 1 for update;

  select * into v_existing
    from ledger
   where player_id = p_player and idempotency_key = p_key;
  if found then
    return jsonb_build_object(
      'replay', true,
      'tokens', v_tokens,
      'jackpot', v_jackpot,
      'delta', v_existing.delta,
      'meta', v_existing.meta
    );
  end if;

  if p_min_interval_ms > 0 then
    select created_at into v_last
      from ledger
     where player_id = p_player and kind = 'slot_spin'
     order by created_at desc
     limit 1;
    if v_last is not null and v_last > clock_timestamp() - (p_min_interval_ms * interval '1 millisecond') then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  if v_tokens < p_bet then
    raise exception 'insufficient' using errcode = 'P0001';
  end if;

  v_delta := p_payout - p_bet;
  v_tokens := v_tokens + v_delta;

  if p_jackpot_hit then
    v_jackpot := 50;
  else
    v_jackpot := v_jackpot + ceil(p_bet / 2.0)::integer;
  end if;

  update players set tokens = v_tokens where id = p_player;
  update economy set jackpot = v_jackpot where id = 1;

  insert into ledger (player_id, kind, delta, idempotency_key, meta)
  values (p_player, 'slot_spin', v_delta, p_key, coalesce(p_meta, '{}'::jsonb));

  return jsonb_build_object(
    'replay', false,
    'tokens', v_tokens,
    'jackpot', v_jackpot,
    'delta', v_delta,
    'meta', coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

-- ── chest: spend + append the server-rolled item ─────────────────────────

create or replace function wallet_chest(
  p_player uuid,
  p_cost integer,
  p_item jsonb,
  p_key text,
  p_meta jsonb default '{}'::jsonb,
  p_min_interval_ms integer default 800
) returns jsonb
language plpgsql
as $$
declare
  v_tokens integer;
  v_inv jsonb;
  v_existing ledger%rowtype;
  v_last timestamptz;
begin
  if p_cost < 1 or p_item is null then
    raise exception 'bad_amount' using errcode = 'P0001';
  end if;

  select tokens, inventory into v_tokens, v_inv
    from players
   where id = p_player
   for update;
  if not found then
    raise exception 'no_player' using errcode = 'P0001';
  end if;

  select * into v_existing
    from ledger
   where player_id = p_player and idempotency_key = p_key;
  if found then
    return jsonb_build_object(
      'replay', true,
      'tokens', v_tokens,
      'inventory', coalesce(v_inv, '[]'::jsonb),
      'delta', v_existing.delta,
      'meta', v_existing.meta
    );
  end if;

  if p_min_interval_ms > 0 then
    select created_at into v_last
      from ledger
     where player_id = p_player and kind = 'chest_open'
     order by created_at desc
     limit 1;
    if v_last is not null and v_last > clock_timestamp() - (p_min_interval_ms * interval '1 millisecond') then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;

  if v_tokens < p_cost then
    raise exception 'insufficient' using errcode = 'P0001';
  end if;

  v_tokens := v_tokens - p_cost;
  v_inv := coalesce(v_inv, '[]'::jsonb) || jsonb_build_array(p_item);

  update players
     set tokens = v_tokens,
         inventory = v_inv
   where id = p_player;

  insert into ledger (player_id, kind, delta, idempotency_key, meta)
  values (p_player, 'chest_open', -p_cost, p_key, coalesce(p_meta, '{}'::jsonb));

  return jsonb_build_object(
    'replay', false,
    'tokens', v_tokens,
    'inventory', v_inv,
    'delta', -p_cost,
    'meta', coalesce(p_meta, '{}'::jsonb)
  );
end;
$$;

-- Magic-link merge must move ledger rows before the dropped player cascades.

create or replace function merge_players(p_keep uuid, p_drop uuid)
returns void
language plpgsql
as $$
declare
  drop_tokens integer;
  drop_inv jsonb;
begin
  if p_keep = p_drop then
    return;
  end if;

  select tokens, inventory into drop_tokens, drop_inv from players where id = p_drop;

  update players
     set tokens = tokens + coalesce(drop_tokens, 0),
         inventory = coalesce(inventory, '[]'::jsonb) || coalesce(drop_inv, '[]'::jsonb)
   where id = p_keep;

  if not exists (select 1 from claims where player_id = p_keep) then
    update claims set player_id = p_keep where player_id = p_drop;
  end if;

  update ledger l
     set player_id = p_keep
   where l.player_id = p_drop
     and not exists (
       select 1 from ledger x
        where x.player_id = p_keep
          and x.idempotency_key = l.idempotency_key
     );
  delete from ledger where player_id = p_drop;

  delete from players where id = p_drop;
end;
$$;
