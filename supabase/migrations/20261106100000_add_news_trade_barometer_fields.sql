-- Add explicit news-trade attribution and release metadata for the News Trading Performance Barometer.
-- Existing journal entries default to not_news and are not retroactively counted.

alter table public.private_trades
  add column if not exists news_trade_attribution text not null default 'not_news',
  add column if not exists news_event_type text,
  add column if not exists news_event_name text,
  add column if not exists news_event_at timestamptz;

alter table public.private_trades
  drop constraint if exists private_trades_news_trade_attribution_check;

alter table public.private_trades
  add constraint private_trades_news_trade_attribution_check
  check (news_trade_attribution in ('not_news','direct_news','event_context'));

alter table public.private_trades
  add constraint private_trades_news_event_required_check
  check (
    news_trade_attribution <> 'direct_news'
    or (nullif(btrim(news_event_type),'') is not null and nullif(btrim(news_event_name),'') is not null)
  );

create index if not exists private_trades_news_barometer_idx
  on public.private_trades (owner_id, news_trade_attribution, closed_at desc)
  where news_trade_attribution = 'direct_news';
