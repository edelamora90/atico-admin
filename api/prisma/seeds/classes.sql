INSERT INTO "Class"
(
  id,
  "courseId",
  "teacherId",
  "roomId",
  "startDate",
  "durationMinutes",
  capacity,
  "createdAt"
)
VALUES
(gen_random_uuid()::text,'41885fbb-a402-4830-949d-d38e21b52fe0','ec4fbc85-92a1-4bdf-acaa-e78b802f200c','3680127d-ed15-411a-8976-7e65c0813994',NOW() + INTERVAL '1 day',60,25,NOW()),
(gen_random_uuid()::text,'41885fbb-a402-4830-949d-d38e21b52fe0','ec4fbc85-92a1-4bdf-acaa-e78b802f200c','3680127d-ed15-411a-8976-7e65c0813994',NOW() + INTERVAL '2 days',60,25,NOW());
