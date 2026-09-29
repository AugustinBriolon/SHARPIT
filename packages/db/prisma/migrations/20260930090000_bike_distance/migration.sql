-- A ride's distance: the providers summarise it, the schema had nowhere to keep it, so the
-- app read « 0,0 km » beside the ride's time.
ALTER TABLE "BikeMetrics" ADD COLUMN "distanceM" DOUBLE PRECISION;

-- Rides already stored take the last point of their recorded distance stream.
UPDATE "BikeMetrics" AS b
SET "distanceM" = (s."data"::jsonb -> 'distance' ->> -1)::double precision
FROM "ActivityStream" AS s
WHERE s."activityId" = b."activityId"
  AND b."distanceM" IS NULL
  AND jsonb_typeof(s."data"::jsonb -> 'distance') = 'array'
  AND jsonb_array_length(s."data"::jsonb -> 'distance') > 0
  AND (s."data"::jsonb -> 'distance' ->> -1)::double precision > 0;
