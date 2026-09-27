-- APNs environment per device token: sandbox tokens (Xcode builds) were sent to production APNs.
ALTER TABLE "DeviceToken" ADD COLUMN "environment" TEXT NOT NULL DEFAULT 'production';
