INSERT INTO "Course"
(
  id,
  name,
  description,
  active,
  "createdAt"
)
VALUES
(gen_random_uuid()::text,'Heels','Clase de Heels',true,NOW()),
(gen_random_uuid()::text,'Jazz','Clase de Jazz',true,NOW()),
(gen_random_uuid()::text,'Hip Hop','Clase de Hip Hop',true,NOW()),
(gen_random_uuid()::text,'Ballet','Clase de Ballet',true,NOW()),
(gen_random_uuid()::text,'Contemporáneo','Clase de Danza Contemporánea',true,NOW()),
(gen_random_uuid()::text,'K-Pop','Clase de K-Pop',true,NOW()),
(gen_random_uuid()::text,'Twerk','Clase de Twerk',true,NOW()),
(gen_random_uuid()::text,'Dance Fitness','Clase de Acondicionamiento Físico',true,NOW());
