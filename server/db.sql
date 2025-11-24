drop table if exists task;
create table task (
  id serial primary key,
  description varchar(255) not null
);
insert into task (description) values
  ('Complete the project documentation'),
  ('Review the code changes');
