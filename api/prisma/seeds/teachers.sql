INSERT INTO "Teacher"
(
  id,
  name,
  email,
  phone,
  active,
  "createdAt",
  "updatedAt"
)
VALUES
(gen_random_uuid()::text,'Maestra Ana','ana@atico.com','3120000001',true,NOW(),NOW()),
(gen_random_uuid()::text,'Maestro Luis','luis@atico.com','3120000002',true,NOW(),NOW()),
(gen_random_uuid()::text,'Maestra Sofía','sofia@atico.com','3120000003',true,NOW(),NOW());
