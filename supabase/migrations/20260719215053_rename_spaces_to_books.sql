-- "Space" meant nothing in a finance context. "Book" (as in "keeping
-- separate books") is a phrase people already understand. Pure rename —
-- no behavioral change here.
alter table public.spaces rename to books;
alter table public.transactions rename column space_id to book_id;
alter table public.imports rename column space_id to book_id;

alter index transactions_space_id_idx rename to transactions_book_id_idx;

alter policy "spaces_select_own" on public.books rename to "books_select_own";
alter policy "spaces_insert_own" on public.books rename to "books_insert_own";
alter policy "spaces_update_own" on public.books rename to "books_update_own";
alter policy "spaces_delete_own" on public.books rename to "books_delete_own";
