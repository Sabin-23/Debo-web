-- Create the function that handles new user profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin, created_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    false,
    now()
  );
  return new;
end;
$$;

-- Create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();
