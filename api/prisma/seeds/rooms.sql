INSERT INTO "Room"
(
  id,
  name,
  capacity,
  active,
  "createdAt"
)
VALUES
(gen_random_uuid()::text,'Salón Principal',30,true,NOW()),
(gen_random_uuid()::text,'Salón 2',20,true,NOW()),
(gen_random_uuid()::text,'Sala de Juntas',12,true,NOW()),
(gen_random_uuid()::text,'Bodega',5,true,NOW());
