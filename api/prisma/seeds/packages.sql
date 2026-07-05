INSERT INTO "Package"
(
  id,
  name,
  price,
  credits,
  "teacherPercentage",
  "atticPercentage",
  "createdAt",
  "updatedAt"
)
VALUES
(gen_random_uuid()::text,'Clase muestra',120,1,0,120,NOW(),NOW()),
(gen_random_uuid()::text,'Day Pass',250,1,0,250,NOW(),NOW()),
(gen_random_uuid()::text,'4 clases',340,4,25.50,314.50,NOW(),NOW()),
(gen_random_uuid()::text,'8 clases',550,8,41.25,508.75,NOW(),NOW()),
(gen_random_uuid()::text,'12 clases',780,12,58.50,721.50,NOW(),NOW()),
(gen_random_uuid()::text,'16 clases',1000,16,75.00,925.00,NOW(),NOW()),
(gen_random_uuid()::text,'32 clases',1800,32,135.00,1665.00,NOW(),NOW());
